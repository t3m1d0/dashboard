# ============================================================
# app/routers/uploads.py — Upload e parsing de arquivos
# ============================================================
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import os, uuid, json
import pandas as pd

from app.core.database import get_db
from app.core.config import settings
from app.core.security import get_current_user
from app.schemas import UploadResponse
from app.services import UploadService, ChamadoService, ProjetoService, KPIService, AuditService

router = APIRouter(prefix="/uploads", tags=["Uploads"])

ALLOWED_EXTS = {".csv", ".xlsx", ".xls", ".json"}
MAX_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


def _ensure_upload_dir():
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)


def _read_file(path: str, filename: str) -> pd.DataFrame:
    if filename.endswith(".csv"):
        return pd.read_csv(path, encoding="utf-8-sig")
    elif filename.endswith((".xlsx", ".xls")):
        return pd.read_excel(path)
    raise ValueError("Formato não suportado")


def _normalizar_coluna(col: str) -> str:
    """Normaliza nome de coluna: remove espaços, acentos, maiúsculas."""
    import unicodedata
    col = str(col).strip().upper()
    col = unicodedata.normalize("NFKD", col).encode("ascii", "ignore").decode()
    return col.replace(" ", "_").replace("-", "_")


async def _import_chamados(df: pd.DataFrame, empresa_id, db: AsyncSession) -> dict:
    """
    Importa chamados com mapeamento flexível de colunas.
    Aceita variações de nomes de coluna em PT-BR.
    Retorna stats do que foi importado.
    """
    svc = ChamadoService(db)

    # Normalizar colunas
    df.columns = [_normalizar_coluna(c) for c in df.columns]

    # Mapa flexível: variações aceitas → campo interno
    COL_MAP = {
        # Título / assunto principal
        "TITULO": "titulo", "ASSUNTO": "titulo", "CHAMADO": "titulo",
        "DESCRICAO_CURTA": "titulo", "SUBJECT": "titulo",
        # Descrição
        "DESCRICAO": "descricao", "DESCRICAO_LONGA": "descricao", "DESCRIPTION": "descricao",
        # Categoria
        "CATEGORIA": "categoria", "AREA": "categoria", "SETOR": "categoria",
        "TIPO": "categoria", "CATEGORY": "categoria",
        # Assunto/sub-categoria
        "SUB_CATEGORIA": "assunto", "SUBCATEGORIA": "assunto",
        "ASSUNTO_DETALHE": "assunto", "TOPICO": "assunto",
        # Prioridade
        "PRIORIDADE": "prioridade", "PRIORITY": "prioridade",
        "URGENCIA": "prioridade", "NIVEL": "prioridade",
        # Status
        "STATUS": "status", "SITUACAO": "status", "STATE": "status",
        # SLA
        "DENTRO_SLA": "dentro_sla", "SLA": "dentro_sla", "ATENDEU_SLA": "dentro_sla",
        # Datas
        "DATA_ABERTURA": "criado_em", "DATA_CRIACAO": "criado_em",
        "ABERTURA": "criado_em", "CREATED_AT": "criado_em",
        "DATA_FECHAMENTO": "resolvido_em", "DATA_RESOLUCAO": "resolvido_em",
        "FECHAMENTO": "resolvido_em",
        # Outros
        "FRANQUIA": "franquia", "UNIDADE": "franquia",
    }

    # Detectar quais colunas do arquivo temos
    col_found = {}
    for orig_col in df.columns:
        if orig_col in COL_MAP:
            col_found[orig_col] = COL_MAP[orig_col]

    if not col_found:
        raise ValueError(f"Nenhuma coluna reconhecida. Colunas encontradas: {list(df.columns)}")

    df = df.rename(columns=col_found)

    # Normalizar prioridade
    PRIO_MAP = {
        "alta": "alta", "high": "alta", "urgente": "critica", "critica": "critica",
        "media": "media", "normal": "media", "medium": "media",
        "baixa": "baixa", "low": "baixa",
    }
    # Normalizar status
    STATUS_MAP = {
        "aberto": "aberto", "novo": "aberto", "new": "aberto", "open": "aberto",
        "em atendimento": "em_atendimento", "em andamento": "em_atendimento", "in progress": "em_atendimento",
        "resolvido": "resolvido", "resolved": "resolvido", "fechado": "fechado", "closed": "fechado",
    }

    imported = 0
    errors = []
    por_categoria: dict = {}
    por_status: dict = {}

    for idx, row in df.iterrows():
        try:
            titulo = str(row.get("titulo", "")).strip()
            if not titulo or titulo == "nan":
                continue

            # Normalizar prioridade
            prio_raw = str(row.get("prioridade", "media")).strip().lower()
            prioridade = PRIO_MAP.get(prio_raw, "media")

            # Normalizar status
            status_raw = str(row.get("status", "aberto")).strip().lower()
            status = STATUS_MAP.get(status_raw, "aberto")

            # SLA
            sla_raw = str(row.get("dentro_sla", "")).strip().lower()
            dentro_sla = sla_raw in ("sim", "yes", "true", "1", "s", "x") if sla_raw else None

            # Datas
            criado_em = None
            if "criado_em" in row and pd.notna(row["criado_em"]):
                try:
                    criado_em = pd.to_datetime(row["criado_em"]).to_pydatetime()
                except Exception:
                    pass

            resolvido_em = None
            if "resolvido_em" in row and pd.notna(row["resolvido_em"]):
                try:
                    resolvido_em = pd.to_datetime(row["resolvido_em"]).to_pydatetime()
                except Exception:
                    pass

            categoria = str(row.get("categoria", "")).strip() or None
            assunto   = str(row.get("assunto",   "")).strip() or None
            descricao = str(row.get("descricao", "")).strip() or None

            # Contar por categoria/status para o relatório
            if categoria:
                por_categoria[categoria] = por_categoria.get(categoria, 0) + 1
            por_status[status] = por_status.get(status, 0) + 1

            data = {
                "titulo":     titulo[:200],
                "descricao":  descricao[:2000] if descricao else None,
                "categoria":  categoria[:80]   if categoria else None,
                "assunto":    assunto[:150]    if assunto   else None,
                "prioridade": prioridade,
                "status":     status,
                "dentro_sla": dentro_sla,
            }
            if criado_em:   data["criado_em"]   = criado_em
            if resolvido_em: data["resolvido_em"] = resolvido_em

            await svc.create(data, empresa_id=empresa_id)
            imported += 1

        except Exception as e:
            errors.append(f"Linha {idx + 2}: {str(e)}")

    return {
        "importados": imported,
        "erros": len(errors),
        "por_categoria": por_categoria,
        "por_status": por_status,
        "colunas_mapeadas": list(col_found.keys()),
        "primeiros_erros": errors[:5],
    }


async def _import_kpi_sustentacao(df: pd.DataFrame, empresa_id, kpi_svc: KPIService) -> dict:
    """
    Importa KPIs agregados de sustentação (totais mensais).
    Formato esperado: uma linha por mês com totais.
    """
    df.columns = [_normalizar_coluna(c) for c in df.columns]

    KPI_COL_MAP = {
        "MES": "mes", "MES_ANO": "mes", "PERIODO": "mes", "MONTH": "mes",
        "ANO": "ano", "YEAR": "ano",
        "TOTAL_CHAMADOS": "chamadosAtendidos", "CHAMADOS": "chamadosAtendidos",
        "TOTAL_ATENDIDOS": "chamadosAtendidos",
        "SLA": "slaMedia", "SLA_MEDIA": "slaMedia", "PERC_SLA": "slaMedia",
        "RESOLUCAO_PRIMEIRO": "resolucaoPrimeiroAtendimento",
        "CHAMADOS_CRITICOS": "chamadosCriticos", "CRITICOS": "chamadosCriticos",
        "USUARIOS": "usuariosAtendidos", "USUARIOS_ATENDIDOS": "usuariosAtendidos",
        "FRANQUIAS": "franquiasAtendidas", "FRANQUIAS_ATENDIDAS": "franquiasAtendidas",
        "SATISFACAO": "satisfacaoInterna", "NPS": "satisfacaoInterna",
    }

    MESES_PT = {
        "janeiro": 1, "fevereiro": 2, "marco": 3, "marco": 3, "abril": 4,
        "maio": 5, "junho": 6, "julho": 7, "agosto": 8, "setembro": 9,
        "outubro": 10, "novembro": 11, "dezembro": 12,
        "jan": 1, "fev": 2, "mar": 3, "abr": 4, "mai": 5, "jun": 6,
        "jul": 7, "ago": 8, "set": 9, "out": 10, "nov": 11, "dez": 12,
    }
    MESES_NOMES = ["", "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
                   "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"]

    imported = 0
    for _, row in df.iterrows():
        try:
            # Determinar período
            mes_raw = str(row.get("MES") or row.get("MES_ANO") or row.get("PERIODO") or "").strip().lower()
            ano_raw = row.get("ANO") or row.get("YEAR")

            mes_num = 0
            ano_num = int(ano_raw) if ano_raw and str(ano_raw) != "nan" else 2025

            # Tentar parsear mês
            if mes_raw:
                if mes_raw.isdigit():
                    mes_num = int(mes_raw)
                elif "/" in mes_raw:
                    parts = mes_raw.split("/")
                    mes_num = int(parts[0]) if parts[0].isdigit() else MESES_PT.get(parts[0], 0)
                    if len(parts) > 1 and parts[1].isdigit() and int(parts[1]) > 12:
                        ano_num = int(parts[1])
                else:
                    mes_num = MESES_PT.get(mes_raw, 0)

            if mes_num == 0:
                continue

            periodo = f"{ano_num}-{mes_num:02d}"
            mes_nome = MESES_NOMES[mes_num]

            # Construir dados KPI
            def val(col, default=0):
                v = row.get(col)
                if v is None or (isinstance(v, float) and pd.isna(v)):
                    return default
                try: return float(str(v).replace(",", ".").replace("%", ""))
                except: return default

            visao_geral = {
                "chamadosAtendidos":            {"valor": int(val("TOTAL_CHAMADOS") or val("CHAMADOS") or val("TOTAL_ATENDIDOS")), "anterior": 0},
                "slaMedia":                     {"valor": val("SLA") or val("SLA_MEDIA"), "anterior": 0, "meta": 95},
                "resolucaoPrimeiroAtendimento": {"valor": val("RESOLUCAO_PRIMEIRO"), "anterior": 0, "meta": 70},
                "chamadosCriticos":             {"valor": int(val("CHAMADOS_CRITICOS") or val("CRITICOS")), "anterior": 0},
                "usuariosAtendidos":            {"valor": int(val("USUARIOS") or val("USUARIOS_ATENDIDOS")), "anterior": 0},
                "franquiasAtendidas":           {"valor": int(val("FRANQUIAS") or val("FRANQUIAS_ATENDIDAS")), "anterior": 0},
                "entregasDesenvolvimento":      {"valor": 0, "anterior": 0},
                "projetosAndamento":            {"valor": 0, "anterior": 0},
                "satisfacaoInterna":            {"valor": val("SATISFACAO") or val("NPS"), "anterior": 0, "escala": 5},
            }

            dados = {"visaoGeral": visao_geral}
            await kpi_svc.upsert(periodo=periodo, mes=mes_nome, ano=ano_num, dados=dados, empresa_id=empresa_id)
            imported += 1
        except Exception:
            continue

    return {"importados": imported}


@router.post("/sustentacao", status_code=201)
async def upload_sustentacao(
    file: UploadFile = File(...),
    modo: str = Form("chamados"),  # chamados | kpis
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Upload específico para dados de Sustentação.
    modo=chamados → importa registros individuais de chamados
    modo=kpis     → importa totais mensais (KPI snapshot)
    """
    _ensure_upload_dir()

    content = await file.read()
    if len(content) > MAX_BYTES:
        raise HTTPException(413, f"Arquivo muito grande. Máximo: {settings.MAX_UPLOAD_SIZE_MB}MB")

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTS:
        raise HTTPException(400, f"Formato não suportado. Use: {', '.join(ALLOWED_EXTS)}")

    # Salvar arquivo
    filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(content)

    resultado = {}
    try:
        if ext == ".json":
            dados_json = json.loads(content)
            kpi_svc = KPIService(db)
            # JSON com estrutura completa de KPI
            periodo = dados_json.get("meta", {}).get("periodo") or dados_json.get("periodo", "2025-01")
            mes     = dados_json.get("meta", {}).get("mes", "")
            ano     = dados_json.get("meta", {}).get("ano", 2025)
            await kpi_svc.upsert(periodo=periodo, mes=mes, ano=ano, dados=dados_json, empresa_id=current_user.empresa_id)
            resultado = {"importados": 1, "tipo": "kpi_json"}
        else:
            df = _read_file(filepath, file.filename or "")
            if modo == "kpis":
                kpi_svc = KPIService(db)
                resultado = await _import_kpi_sustentacao(df, current_user.empresa_id, kpi_svc)
                resultado["tipo"] = "kpis_mensais"
            else:
                resultado = await _import_chamados(df, current_user.empresa_id, db)
                resultado["tipo"] = "chamados"

    except ValueError as e:
        os.remove(filepath)
        raise HTTPException(422, str(e))
    except Exception as e:
        os.remove(filepath)
        raise HTTPException(500, f"Erro ao processar: {str(e)}")

    # Registrar upload
    upload = await UploadService(db).create({
        "tipo":            "sustentacao",
        "nome_arquivo":    file.filename or filename,
        "caminho":         filepath,
        "tamanho_bytes":   len(content),
        "total_registros": resultado.get("importados", 0),
        "status":          "processado",
        "usuario_id":      current_user.id,
        "empresa_id":      current_user.empresa_id,
    })

    await AuditService(db).log(
        "upload.sustentacao", current_user.id, "upload", str(upload.id),
        dados=resultado
    )

    return {
        "id":            str(upload.id),
        "nome_arquivo":  file.filename,
        "resultado":     resultado,
        "total_importado": resultado.get("importados", 0),
    }


@router.get("/sustentacao/template")
async def download_template(
    modo: str = "chamados",
    current_user=Depends(get_current_user),
):
    """Retorna estrutura esperada do arquivo para guiar o usuário."""
    if modo == "kpis":
        return {
            "modo": "kpis",
            "descricao": "Totais mensais de KPIs de sustentação",
            "colunas_obrigatorias": ["MES", "ANO"],
            "colunas_opcionais": [
                "TOTAL_CHAMADOS", "SLA", "RESOLUCAO_PRIMEIRO",
                "CHAMADOS_CRITICOS", "USUARIOS", "FRANQUIAS", "SATISFACAO"
            ],
            "exemplo": [
                {"MES": "Janeiro", "ANO": 2026, "TOTAL_CHAMADOS": 847, "SLA": 94.7, "CHAMADOS_CRITICOS": 12},
                {"MES": "Fevereiro", "ANO": 2026, "TOTAL_CHAMADOS": 912, "SLA": 96.1, "CHAMADOS_CRITICOS": 8},
            ],
            "variacoes_aceitas": {
                "MES": ["MES", "MES_ANO", "PERIODO", "MONTH"],
                "TOTAL_CHAMADOS": ["TOTAL_CHAMADOS", "CHAMADOS", "TOTAL_ATENDIDOS"],
                "SLA": ["SLA", "SLA_MEDIA", "PERC_SLA"],
            }
        }
    else:
        return {
            "modo": "chamados",
            "descricao": "Registros individuais de chamados/tickets",
            "colunas_obrigatorias": ["TITULO"],
            "colunas_opcionais": [
                "DESCRICAO", "CATEGORIA", "ASSUNTO", "PRIORIDADE",
                "STATUS", "DENTRO_SLA", "DATA_ABERTURA", "DATA_FECHAMENTO"
            ],
            "exemplo": [
                {"TITULO": "Lentidão no ERP", "CATEGORIA": "ERP", "PRIORIDADE": "Alta", "STATUS": "Resolvido", "DENTRO_SLA": "Sim", "DATA_ABERTURA": "2026-05-01"},
            ],
            "variacoes_aceitas": {
                "TITULO": ["TITULO", "ASSUNTO", "CHAMADO", "SUBJECT"],
                "CATEGORIA": ["CATEGORIA", "AREA", "SETOR", "TIPO"],
                "PRIORIDADE": ["PRIORIDADE", "URGENCIA", "NIVEL"],
                "STATUS": ["STATUS", "SITUACAO", "STATE"],
                "DENTRO_SLA": ["DENTRO_SLA", "SLA", "ATENDEU_SLA"],
            }
        }


# ── Endpoint genérico (mantido para compatibilidade) ──────────
@router.post("", response_model=UploadResponse, status_code=201)
async def upload_file(
    tipo: str = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    _ensure_upload_dir()
    content = await file.read()
    if len(content) > MAX_BYTES:
        raise HTTPException(413, f"Arquivo muito grande.")

    ext = os.path.splitext(file.filename or "")[1].lower()
    filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)
    with open(filepath, "wb") as f:
        f.write(content)

    total_registros = 0
    try:
        if ext in (".csv", ".xlsx", ".xls"):
            df = _read_file(filepath, file.filename or "")
            if tipo == "sustentacao":
                r = await _import_chamados(df, current_user.empresa_id, db)
                total_registros = r.get("importados", 0)
            else:
                total_registros = len(df)
    except Exception as e:
        os.remove(filepath)
        raise HTTPException(422, f"Erro: {str(e)}")

    upload = await UploadService(db).create({
        "tipo": tipo, "nome_arquivo": file.filename or filename,
        "caminho": filepath, "tamanho_bytes": len(content),
        "total_registros": total_registros, "status": "processado",
        "usuario_id": current_user.id, "empresa_id": current_user.empresa_id,
    })
    return upload


@router.get("", response_model=List[UploadResponse])
async def list_uploads(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await UploadService(db).list(current_user.empresa_id)
