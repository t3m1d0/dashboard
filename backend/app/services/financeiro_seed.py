# ============================================================
# app/services/financeiro_seed.py
# Importa a estrutura da rede Muniz do HTML para o banco
# ============================================================
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.financeiro import FinFranqueado, FinRegiao, FinLoja

# ── Dados extraídos do HTML (REDE.franqueados, REDE.regioes, REDE.lojas) ──
FRANQUEADOS = [
    {'id':'f14','nome':'MAEDSON'},{'id':'f18','nome':'RENAN'},
    {'id':'f19','nome':'RENAN ANTONIO'},{'id':'f20','nome':'RENAN E BRANDÃO'},
    {'id':'f21','nome':'RENAN E HUMBERTO'},{'id':'f22','nome':'RENAN KESSIA'},
    {'id':'f26','nome':'VINICIUS'},{'id':'f27','nome':'VINICIUS - FRANQUEADO'},
    {'id':'f5','nome':'DEMERSON'},{'id':'f1','nome':'ADRIANO'},
    {'id':'f38','nome':'ADRIANO OUTRO'},{'id':'f31','nome':'ANA'},
    {'id':'f2','nome':'ANGELO'},{'id':'f3','nome':'ANTONIO'},
    {'id':'f4','nome':'BRUNO'},{'id':'f6','nome':'EDUARDO'},
    {'id':'f7','nome':'FELIPE'},{'id':'f8','nome':'FRANCI E FERNANDA'},
    {'id':'f35','nome':'FRANCISLEI'},{'id':'f32','nome':'Gerencia fora'},
    {'id':'f36','nome':'GIULIANO'},{'id':'f37','nome':'GUILHERME'},
    {'id':'f9','nome':'HENRIQUE'},{'id':'f10','nome':'JAQUES'},
    {'id':'f30','nome':'JEAN'},{'id':'f11','nome':'LUAN E ODIR'},
    {'id':'f12','nome':'LUIZ'},{'id':'f13','nome':'LUIZ E ROGER'},
    {'id':'f15','nome':'MATHEUS'},{'id':'f16','nome':'PAULO E OLEGARIO'},
    {'id':'f17','nome':'RAFINHA'},{'id':'f33','nome':'RAUNI'},
    {'id':'f24','nome':'SHARDSON'},{'id':'f23','nome':'SÉRGIO'},
    {'id':'f25','nome':'VALÉRIA'},{'id':'f34','nome':'VITOR'},
    {'id':'f28','nome':'WESLEY'},{'id':'f29','nome':'ZUCCO'},
]

REGIOES = [
    {'id':'rg1','nome':'Sudeste','fid':'f1'},{'id':'rg2','nome':'Nordeste','fid':'f2'},
    {'id':'rg3','nome':'Nordeste','fid':'f3'},{'id':'rg4','nome':'Sudeste','fid':'f3'},
    {'id':'rg5','nome':'Nordeste','fid':'f4'},{'id':'rg6','nome':'Sul','fid':'f5'},
    {'id':'rg7','nome':'Nordeste','fid':'f5'},{'id':'rg8','nome':'Sul','fid':'f6'},
    {'id':'rg9','nome':'Nordeste','fid':'f7'},{'id':'rg10','nome':'Sul','fid':'f8'},
    {'id':'rg11','nome':'Sudeste','fid':'f9'},{'id':'rg12','nome':'Sudeste','fid':'f10'},
    {'id':'rg13','nome':'Norte','fid':'f11'},{'id':'rg14','nome':'Centro-Oeste','fid':'f12'},
    {'id':'rg15','nome':'Sudeste','fid':'f13'},{'id':'rg16','nome':'Sul','fid':'f14'},
    {'id':'rg17','nome':'Nordeste','fid':'f14'},{'id':'rg18','nome':'Sudeste','fid':'f14'},
    {'id':'rg19','nome':'Sudeste','fid':'f15'},{'id':'rg20','nome':'Sudeste','fid':'f16'},
    {'id':'rg21','nome':'Sudeste','fid':'f17'},{'id':'rg22','nome':'Sul','fid':'f18'},
    {'id':'rg23','nome':'Centro-Oeste','fid':'f18'},{'id':'rg24','nome':'Nordeste','fid':'f18'},
    {'id':'rg25','nome':'Sul','fid':'f19'},{'id':'rg26','nome':'Sudeste','fid':'f20'},
    {'id':'rg27','nome':'Nordeste','fid':'f20'},{'id':'rg28','nome':'Sul','fid':'f20'},
    {'id':'rg29','nome':'Centro-Oeste','fid':'f20'},{'id':'rg30','nome':'Nordeste','fid':'f21'},
    {'id':'rg31','nome':'Centro-Oeste','fid':'f21'},{'id':'rg32','nome':'Nordeste','fid':'f22'},
    {'id':'rg33','nome':'Sul','fid':'f23'},{'id':'rg34','nome':'Centro-Oeste','fid':'f24'},
    {'id':'rg35','nome':'Nordeste','fid':'f25'},{'id':'rg36','nome':'Sudeste','fid':'f26'},
    {'id':'rg37','nome':'Nordeste','fid':'f26'},{'id':'rg38','nome':'Centro-Oeste','fid':'f26'},
    {'id':'rg39','nome':'Sul','fid':'f26'},{'id':'rg40','nome':'Sudeste','fid':'f27'},
    {'id':'rg41','nome':'Norte','fid':'f28'},{'id':'rg42','nome':'Sul','fid':'f29'},
    {'id':'rg43','nome':'Sul','fid':'f30'},{'id':'rg44','nome':'Norte','fid':'f31'},
    {'id':'rg45','nome':'Sul','fid':'f32'},{'id':'rg46','nome':'Norte','fid':'f32'},
    {'id':'rg47','nome':'Sudeste','fid':'f33'},{'id':'rg48','nome':'Sudeste','fid':'f34'},
    {'id':'rg49','nome':'Sul','fid':'f35'},{'id':'rg50','nome':'Nordeste','fid':'f32'},
    {'id':'rg51','nome':'Sudeste','fid':'f36'},{'id':'rg52','nome':'Sudeste','fid':'f32'},
    {'id':'rg53','nome':'Sudeste','fid':'f37'},{'id':'rg54','nome':'Sudeste','fid':'f35'},
    {'id':'rg55','nome':'Sul','fid':'f38'},
]

LOJAS = [
    {'id':'l32','nome':'CATANDUVA SP','uf':'SP','fid':'f1','rid':'rg1'},
    {'id':'l55','nome':'JEQUIÉ','uf':'BA','fid':'f2','rid':'rg2'},
    {'id':'l114','nome':'TEIXEIRA DE FREITAS','uf':'BA','fid':'f2','rid':'rg2'},
    {'id':'l1','nome':'ALAGOINHAS BA (novo)','uf':'BA','fid':'f3','rid':'rg3'},
    {'id':'l100','nome':'SÃO JOSÉ DOS CAMPOS','uf':'SP','fid':'f3','rid':'rg4'},
    {'id':'l28','nome':'CARUARU PE','uf':'PE','fid':'f4','rid':'rg5'},
    {'id':'l57','nome':'JUAZEIRO DO NORTE','uf':'CE','fid':'f4','rid':'rg5'},
    {'id':'l74','nome':'PARNAMIRIM','uf':'RN','fid':'f4','rid':'rg5'},
    {'id':'l10','nome':'BALNEÁRIO CAMBORIÚ','uf':'SC','fid':'f5','rid':'rg6'},
    {'id':'l11','nome':'BALNEÁRIO DE PIÇARRAS','uf':'SC','fid':'f5','rid':'rg6'},
    {'id':'l19','nome':'CABO DE SANTO AGOSTINHO PE','uf':'PE','fid':'f5','rid':'rg7'},
    {'id':'l20','nome':'CAMBORIÚ SC','uf':'SC','fid':'f5','rid':'rg6'},
    {'id':'l22','nome':'CAMPO LARGO','uf':'PR','fid':'f5','rid':'rg6'},
    {'id':'l37','nome':'CURITIBA (Av. Presidente)','uf':'PR','fid':'f5','rid':'rg6'},
    {'id':'l38','nome':'CURITIBA (Linha Verde)','uf':'PR','fid':'f5','rid':'rg6'},
    {'id':'l39','nome':'CURITIBA (Mossunguê)','uf':'PR','fid':'f5','rid':'rg6'},
    {'id':'l40','nome':'CURITIBA (Portão)','uf':'PR','fid':'f5','rid':'rg6'},
    {'id':'l41','nome':'CURITIBA (São José)','uf':'PR','fid':'f5','rid':'rg6'},
    {'id':'l42','nome':'CURITIBA (Xaxim)','uf':'PR','fid':'f5','rid':'rg6'},
    {'id':'l67','nome':'OLINDA','uf':'PE','fid':'f5','rid':'rg7'},
    {'id':'l68','nome':'PALHOÇA SC','uf':'SC','fid':'f5','rid':'rg6'},
    {'id':'l71','nome':'PALHOCA SC 2','uf':'SC','fid':'f5','rid':'rg6'},
    {'id':'l79','nome':'PELOTAS RS','uf':'RS','fid':'f5','rid':'rg6'},
    {'id':'l81','nome':'PIRAQUARA','uf':'PR','fid':'f5','rid':'rg6'},
    {'id':'l84','nome':'PORTO ALEGRE (Dom Pedro)','uf':'RS','fid':'f5','rid':'rg6'},
    {'id':'l85','nome':'PORTO ALEGRE (Farrapos)','uf':'RS','fid':'f5','rid':'rg6'},
    {'id':'l86','nome':'PORTO ALEGRE (Moinhos)','uf':'RS','fid':'f5','rid':'rg6'},
    {'id':'l93','nome':'SAO JOSE SC','uf':'SC','fid':'f5','rid':'rg6'},
    {'id':'l103','nome':'SÃO PAULO (Lapa)','uf':'SP','fid':'f5','rid':'rg7'},
    {'id':'l116','nome':'TERESINA','uf':'PI','fid':'f5','rid':'rg7'},
    {'id':'l118','nome':'UMUARAMA','uf':'PR','fid':'f5','rid':'rg6'},
    {'id':'l33','nome':'CAUCAIA','uf':'CE','fid':'f6','rid':'rg8'},
    {'id':'l36','nome':'CRICIÚMA','uf':'SC','fid':'f6','rid':'rg8'},
    {'id':'l43','nome':'FORTALEZA (Aldeota)','uf':'CE','fid':'f6','rid':'rg8'},
    {'id':'l44','nome':'GUARAPUAVA','uf':'PR','fid':'f35','rid':'rg49'},
    {'id':'l45','nome':'GUARULHOS','uf':'SP','fid':'f36','rid':'rg51'},
    {'id':'l59','nome':'LAGES','uf':'SC','fid':'f35','rid':'rg49'},
    {'id':'l69','nome':'OURINHOS','uf':'SP','fid':'f32','rid':'rg52'},
    {'id':'l75','nome':'PATO BRANCO','uf':'PR','fid':'f35','rid':'rg49'},
    {'id':'l78','nome':'PAULÍNIA','uf':'SP','fid':'f37','rid':'rg53'},
    {'id':'l88','nome':'PRESIDENTE PRUDENTE','uf':'SP','fid':'f33','rid':'rg47'},
    {'id':'l90','nome':'RIO CLARO','uf':'SP','fid':'f35','rid':'rg54'},
    {'id':'l99','nome':'SÃO JOÃO DA BOA VISTA SP','uf':'SP','fid':'f34','rid':'rg48'},
    {'id':'l104','nome':'SÃO PAULO (São Miguel)','uf':'SP','fid':'f36','rid':'rg51'},
    {'id':'l108','nome':'SOROCABA','uf':'SP','fid':'f33','rid':'rg47'},
    {'id':'l115','nome':'TELÊMACO BORBA (NOVA)','uf':'PR','fid':'f38','rid':'rg55'},
    {'id':'l119','nome':'VALINHOS','uf':'SP','fid':'f37','rid':'rg53'},
]


async def seed_rede_muniz(db: AsyncSession) -> dict:
    """
    Importa a estrutura da rede para o banco. Idempotente por código.
    """
    inserted_f = inserted_r = inserted_l = 0

    # Franqueados
    for fd in FRANQUEADOS:
        existing = (await db.execute(
            select(FinFranqueado).where(FinFranqueado.codigo == fd['id'])
        )).scalar_one_or_none()
        if not existing:
            db.add(FinFranqueado(codigo=fd['id'], nome=fd['nome'], status='ativa'))
            inserted_f += 1

    await db.flush()

    # Mapa codigo -> id
    franq_map = {
        r.codigo: r.id
        for r in (await db.execute(select(FinFranqueado))).scalars().all()
    }

    # Regiões
    for rg in REGIOES:
        existing = (await db.execute(
            select(FinRegiao).where(FinRegiao.codigo == rg['id'])
        )).scalar_one_or_none()
        if not existing:
            fid = franq_map.get(rg['fid'])
            if fid:
                db.add(FinRegiao(
                    codigo=rg['id'], nome=rg['nome'],
                    franqueado_id=fid, franqueado_codigo=rg['fid'],
                ))
                inserted_r += 1

    await db.flush()

    regiao_map = {
        r.codigo: r.id
        for r in (await db.execute(select(FinRegiao))).scalars().all()
    }

    # Lojas
    for lj in LOJAS:
        existing = (await db.execute(
            select(FinLoja).where(FinLoja.codigo == lj['id'])
        )).scalar_one_or_none()
        if not existing:
            fid = franq_map.get(lj['fid'])
            rid = regiao_map.get(lj.get('rid'))
            if fid:
                db.add(FinLoja(
                    codigo=lj['id'], nome=lj['nome'], uf=lj.get('uf'), status='ativa',
                    franqueado_id=fid, franqueado_codigo=lj['fid'],
                    regiao_id=rid, regiao_codigo=lj.get('rid'),
                ))
                inserted_l += 1

    await db.flush()

    return {
        'franqueados': inserted_f,
        'regioes':     inserted_r,
        'lojas':       inserted_l,
        'total':       inserted_f + inserted_r + inserted_l,
    }
