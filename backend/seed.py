"""Seed demonstrativo da plataforma ADMINISTRE-SE CAST.

Rodar:  cd /app/backend && python seed.py
Recria os dados de demonstração (marcados com is_demo=True) e as categorias.
Contas demo: ana@demo.com / Demo@2025  ·  admin: admin@administrase.com / Admin@2025
"""
import asyncio
import uuid
from datetime import datetime, timedelta, timezone

from lib.auth import hash_password
from lib.db import client, db, ensure_indexes

COLLECTIONS = [
    "users", "publications", "programs", "comments", "likes", "follows",
    "saved", "playlists", "history", "notifications", "reports",
    "categories", "password_resets", "status_checks",
]

CATEGORY_NAMES = [
    "Gestão de Pessoas", "Marketing", "Finanças", "Empreendedorismo",
    "Logística", "Gestão de Projetos", "Liderança", "Estratégia Empresarial",
    "Recursos Humanos", "Carreira e Estágio", "Administração Pública",
    "Inovação e Tecnologia",
]

IMG = {
    "videocast_studio": "https://images.unsplash.com/photo-1559523161-0fc0d8b38a7a?q=85&w=1280&fm=jpg",
    "audio_mixer": "https://images.unsplash.com/photo-1615458318132-1f151a3d18f4?q=85&w=1280&fm=jpg",
    "podcast_cover_a": "https://images.unsplash.com/photo-1589903308904-1010c2294adc?q=85&w=1280&fm=jpg",
    "podcast_cover_b": "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?q=85&w=1280&fm=jpg",
    "podcast_cover_c": "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?q=85&w=1280&fm=jpg",
    "mic_gray": "https://images.unsplash.com/photo-1531651008558-ed1740375b39?q=85&w=1280&fm=jpg",
    "boardroom": "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=85&w=1280&fm=jpg",
    "whiteboard": "https://images.unsplash.com/photo-1557804506-669a67965ba0?q=85&w=1280&fm=jpg",
    "students_laptop": "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=85&w=1280&fm=jpg",
    "community": "https://images.unsplash.com/photo-1543269865-cbf427effbad?q=85&w=1280&fm=jpg",
    "teaching": "https://images.unsplash.com/photo-1525130413817-d45c1d127c42?q=85&w=1280&fm=jpg",
    "team_laptops": "https://images.unsplash.com/photo-1565350897149-38dfafa81d83?q=85&w=1280&fm=jpg",
    "meeting_paper": "https://images.unsplash.com/photo-1551135049-8a33b5883817?q=85&w=1280&fm=jpg",
    "group_table": "https://images.unsplash.com/photo-1690378820474-b468b8ee64d3?q=85&w=1280&fm=jpg",
}

AUDIO = [
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
]
VIDEO = {
    "long_a": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    "long_b": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    "short_a": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    "short_b": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    "short_c": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyride.mp4",
}

USERS = [
    dict(key="admin", name="Equipe Administre-se", email="admin@administrase.com", password="Admin@2025",
         role="admin", bio="Moderação e operação da plataforma ADMINISTRE-SE CAST.", institution="", area="Administração", semester=""),
    dict(key="ana", name="Ana Beatriz Costa", email="ana@demo.com", password="Demo@2025",
         role="user", bio="Apaixonada por marketing e comunicação. Escrevo sobre como a Administração conversa com o mundo.", institution="Universidade Federal de Minas Gerais", area="Marketing", semester="7º semestre"),
    dict(key="rafael", name="Rafael Monteiro", email="rafael@demo.com", password="Demo@2025",
         role="user", bio="Estudante de Administração e entusiasta de finanças pessoais. Host do programa Carreira em Foco.", institution="Universidade de São Paulo", area="Finanças", semester="8º semestre"),
    dict(key="carolina", name="Carolina Duarte", email="carolina@demo.com", password="Demo@2025",
         role="user", bio="Futura gestora de pessoas. Acredito que liderança se aprende praticando.", institution="Fundação Getúlio Vargas", area="Gestão de Pessoas", semester="6º semestre"),
    dict(key="pedro", name="Pedro Henrique Lopes", email="pedro@demo.com", password="Demo@2025",
         role="user", bio="Empreendi antes de terminar a graduação. Compartilho os tropeços e as vitórias.", institution="Universidade Federal do Rio de Janeiro", area="Empreendedorismo", semester="9º semestre"),
    dict(key="marina", name="Marina Souza", email="marina@demo.com", password="Demo@2025",
         role="user", bio="Logística é organização aplicada à vida. Estágio suprimentos.", institution="Universidade Estadual de Campinas", area="Logística", semester="5º semestre"),
    dict(key="bruno", name="Bruno Ferreira", email="bruno@demo.com", password="Demo@2025",
         role="user", bio="Conservador por natureza, aprendiz de liderança por vocação.", institution="Universidade Federal do Rio Grande do Sul", area="Liderança", semester="4º semestre"),
]

PROGRAMS = [
    dict(key="p1", key_host="ana", title="Mesa Redonda ADM",
         description="Conversas semanais sobre gestão, carreira e o dia a dia da Administração — com convidados de todos os semestres.",
         cover_url=IMG["podcast_cover_a"]),
    dict(key="p2", key_host="rafael", title="Carreira em Foco",
         description="Episódios sobre estágio, primeiro emprego e crescimento profissional na área de Administração.",
         cover_url=IMG["podcast_cover_b"]),
]


def pub(**kw):
    base = dict(
        id=str(uuid.uuid4()), description="", category="", tags=[],
        media_url="", media_kind="text", thumbnail_url="", cover_url="",
        duration_sec=0, views=0, likes_count=0, comments_count=0,
        status="published", program_id=None, program_title="", episode_number=None,
        resolved=False, is_demo=True,
    )
    base.update(kw)
    return base


def build_publications(user_ids, users, program_ids):
    P = []
    authors = {k: users[k] for k in users}

    def author(key):
        u = authors[key]
        return dict(author_id=user_ids[key], author_name=u["name"], author_avatar=u["avatar_url"])

    def ago(days, hours=0):
        return datetime.now(timezone.utc) - timedelta(days=days, hours=hours)

    P.append(pub(
        type="videocast", title="Videocast: como a IA está mudando a Gestão de Pessoas",
        description="Conversamos sobre como ferramentas de inteligência artificial estão redesenhando rotinas de recrutamento, avaliação de desempenho e desenvolvimento de equipes. O que muda para quem está chegando agora?",
        category="Gestão de Pessoas", tags=["IA", "Gestão de Pessoas", "Futuro do Trabalho"],
        media_url=VIDEO["long_a"], media_kind="video", thumbnail_url=IMG["videocast_studio"],
        duration_sec=596, views=1240, likes_count=38, created_at=ago(2), **author("ana")))
    P.append(pub(
        type="videocast", title="Finanças para estudantes: do orçamento ao fluxo de caixa",
        description="Um guia direto para organizar as finanças pessoais durante a graduação e entender de vez fluxo de caixa — a base de qualquer gestão.",
        category="Finanças", tags=["Finanças", "Orçamento", "Estudantes"],
        media_url=VIDEO["long_b"], media_kind="video", thumbnail_url=IMG["boardroom"],
        duration_sec=653, views=860, likes_count=24, created_at=ago(5), **author("rafael")))
    P.append(pub(
        type="videocast", title="Do TCC ao negócio próprio: empreender na universidade",
        description="Cortes de um bate-papo sobre transformar projetos acadêmicos em negócios reais: validação, primeiros clientes e os erros que evitariamos.",
        category="Empreendedorismo", tags=["Empreendedorismo", "Startups", "TCC"],
        media_url=VIDEO["short_a"], media_kind="video", thumbnail_url=IMG["whiteboard"],
        duration_sec=15, views=2130, likes_count=77, created_at=ago(7), **author("pedro")))
    P.append(pub(
        type="videocast", title="Logística 4.0: tendências que todo administrador deve conhecer",
        description="Automação, dados e visibilidade de ponta a ponta: um panorama das mudanças na cadeia de suprimentos e o que elas exigem de novos profissionais.",
        category="Logística", tags=["Logística", "Supply Chain", "Tecnologia"],
        media_url=VIDEO["short_b"], media_kind="video", thumbnail_url=IMG["group_table"],
        duration_sec=15, views=512, likes_count=12, created_at=ago(12), **author("marina")))

    P.append(pub(
        type="podcast", title="Liderança que inspira: conversa com líderes estudantis",
        description="Primeiro episódio do Mesa Redonda ADM: líderes de centros acadêmicos contam como conduzem equipes voluntárias e aprendizados que levam para a carreira.",
        category="Gestão de Pessoas", tags=["Liderança", "Podcast", "Comunidade"],
        media_url=AUDIO[0], media_kind="audio", cover_url=IMG["podcast_cover_a"],
        duration_sec=372, views=640, likes_count=29, created_at=ago(3),
        program_id=program_ids["p1"], program_title="Mesa Redonda ADM", episode_number=1, **author("ana")))
    P.append(pub(
        type="podcast", title="Carreira sem plano B? Relatos de quem arriscou",
        description="Histórias de quem trocou o caminho seguro pela incerteza — e o que aprenderam no processo.",
        category="Carreira e Estágio", tags=["Carreira", "Relatos"],
        media_url=AUDIO[1], media_kind="audio", cover_url=IMG["podcast_cover_a"],
        duration_sec=318, views=430, likes_count=18, created_at=ago(6),
        program_id=program_ids["p1"], program_title="Mesa Redonda ADM", episode_number=2, **author("ana")))
    P.append(pub(
        type="podcast", title="Marketing pessoal: como se posicionar no LinkedIn",
        description="Dicas práticas de perfil, conteúdo e rede de contatos para estudantes de Administração que querem ser encontrados.",
        category="Marketing", tags=["Marketing", "LinkedIn", "Carreira"],
        media_url=AUDIO[2], media_kind="audio", cover_url=IMG["podcast_cover_a"],
        duration_sec=405, views=780, likes_count=31, created_at=ago(9),
        program_id=program_ids["p1"], program_title="Mesa Redonda ADM", episode_number=3, **author("ana")))
    P.append(pub(
        type="podcast", title="Estágio em banco: o que esperar do primeiro dia",
        description="Rotina, cultura e dicas de quem passou por alguns dos processos seletivos mais concorridos do país.",
        category="Carreira e Estágio", tags=["Estágio", "Bancos", "Carreira"],
        media_url=AUDIO[3], media_kind="audio", cover_url=IMG["podcast_cover_b"],
        duration_sec=350, views=920, likes_count=41, created_at=ago(4),
        program_id=program_ids["p2"], program_title="Carreira em Foco", episode_number=1, **author("rafael")))
    P.append(pub(
        type="podcast", title="Investimentos descomplicados para universitários",
        description="Começar a investir com pouco dinheiro: mitos, verdades e um passo a passo realista para quem está começando.",
        category="Finanças", tags=["Investimentos", "Finanças Pessoais"],
        media_url=AUDIO[4], media_kind="audio", cover_url=IMG["podcast_cover_b"],
        duration_sec=296, views=1150, likes_count=47, created_at=ago(10),
        program_id=program_ids["p2"], program_title="Carreira em Foco", episode_number=2, **author("rafael")))

    P.append(pub(
        type="relato", title="Do medo de falar em público à liderança do projeto",
        description="No primeiro semestre eu não conseguia apresentar um seminário sem tremer. No quarto, assumi a coordenação de um projeto com 12 pessoas. Neste relato conto como os pequenos passos — apresentar em dupla, mediar uma discussão, dar feedback — construíram uma confiança que a faculdade sozinha não daria. Errar em ambiente seguro é o maior atalho que a graduação oferece.",
        category="Liderança", tags=["Liderança", "Superação", "Habilidades"],
        views=340, likes_count=22, created_at=ago(1), **author("carolina")))
    P.append(pub(
        type="relato", title="Como consegui meu primeiro estágio (áudio)",
        description="Gravei um relato em áudio contando todo o processo: currículo, interviews e o que eu faria diferente. Pausa no meio para quem quiser pular direto às dicas.",
        category="Carreira e Estágio", tags=["Estágio", "Entrevistas", "Dicas"],
        media_url=AUDIO[2], media_kind="audio", cover_url=IMG["mic_gray"],
        duration_sec=405, views=560, likes_count=19, created_at=ago(3), **author("bruno")))
    P.append(pub(
        type="relato", title="Minha experiência de intercâmbio acadêmico",
        description="Um semestre fora mudou minha visão de gestão: culturas organizacionais diferentes, aulas com cases locais e a descoberta de que administração é uma linguagem universal.",
        category="Estratégia Empresarial", tags=["Intercâmbio", "Experiências"],
        media_url=VIDEO["short_c"], media_kind="video", thumbnail_url=IMG["teaching"],
        duration_sec=15, views=410, likes_count=15, created_at=ago(8), **author("marina")))
    P.append(pub(
        type="relato", title="Trabalho em equipe: aprendizados do projeto integrador",
        description="Seis pessoas, cinco disciplinas e um prazo. O projeto integrador me ensinou mais sobre gestão de conflitos do que qualquer teoria — divido o que funcionou e o que não funcionou.",
        category="Gestão de Projetos", tags=["Trabalho em Equipe", "Faculdade"],
        views=280, likes_count=17, created_at=ago(4), **author("ana")))

    P.append(pub(
        type="debate", title="A inteligência artificial vai transformar a profissão de administrador?",
        description="Ferramentas de IA já redigem relatórios, analisam dados e otimizam processos. Isso elimina tarefas do administrador ou libera tempo para o que é estrategicamente humano? Contribua com sua tese.",
        category="Inovação e Tecnologia", tags=["IA", "Futuro do Trabalho"],
        views=980, likes_count=34, comments_count=3, created_at=ago(2), **author("pedro")))
    P.append(pub(
        type="debate", title="O que vale mais: experiência ou formação acadêmica?",
        description="Vagas pedem anos de experiência para posições juniores, enquanto diplomas abrem portas. Na prática, o que pesa mais para você — e por quê?",
        category="Carreira e Estágio", tags=["Carreira", "Mercado de Trabalho"],
        views=1450, likes_count=52, comments_count=2, created_at=ago(5), **author("rafael")))
    P.append(pub(
        type="debate", title="É possível empreender durante a faculdade?",
        description="Tempo, dinheiro e energia são limitados. Quem já tentou (ou está tentando) conciliar: vale a pena ou o ideal é esperar o diploma?",
        category="Empreendedorismo", tags=["Empreendedorismo", "Faculdade"],
        views=720, likes_count=26, comments_count=0, created_at=ago(6), **author("ana")))
    P.append(pub(
        type="debate", title="O trabalho remoto aumenta a produtividade?",
        description="Com dados do período pós-pandemia em mãos, vamos debater: autonomia e foco de um lado, colaboração e cultura do outro. Onde está o equilíbrio?",
        category="Gestão de Pessoas", tags=["Trabalho Remoto", "Produtividade"],
        views=1100, likes_count=39, comments_count=1, resolved=True, created_at=ago(11), **author("carolina")))
    return P


COMMENTS_SPEC = [
    # (pub_index, author_key, text, parent_index_in_comments or None, days_ago)
    (13, "ana", "Acredito que a IA elimina a tarefa, não o papel: alguém precisa formular o problema e interpretar o resultado. O administrador vira tradutor entre dados e decisão.", None, 1),
    (13, "carolina", "Discordo parcialmente — em RH vejo recrutadores sendo pressionados a aceitar recomendações de algoritmo sem entender o viés. Precisamos de letramento digital, não só otimismo.", 0, 1),
    (13, "rafael", "Os dois pontos se complementam. Quem souber validar o que a IA entrega sai na frente no mercado.", 1, 0),
    (14, "carolina", "Experiência abre a porta, formação mantém ela aberta. Os dois se reforçam.", None, 3),
    (14, "pedro", "Empreender me ensinou mais que qualquer estágio, mas o diploma me deu credibilidade para negociar.", None, 2),
    (16, "bruno", "Trabalho remoto só funciona com metas claras. Sem gestão de resultados, vira controle de horário à distância.", None, 4),
    (9, "marina", "Sua história me motivou a me candidatar para mediar a semana de negócios. Obrigada por compartilhar!", None, 0),
    (9, "pedro", "Ótimo relato. Falta na graduação é justamente dar palco para essas conquistas.", None, 0),
    (0, "rafael", "O trecho sobre avaliação de desempenho com IA foi o melhor. Compartilhei com a turma de RH.", None, 1),
    (0, "bruno", "Conteúdo excelente, Ana! Quando vem a parte 2?", None, 0),
]

FOLLOWS_SPEC = [
    ("ana", "rafael"), ("ana", "pedro"), ("rafael", "ana"), ("carolina", "ana"),
    ("bruno", "ana"), ("marina", "pedro"), ("pedro", "rafael"), ("bruno", "carolina"),
]

NOTIFICATIONS_SPEC = [
    ("ana", "follow", "carolina", None, "Carolina Duarte começou a seguir você.", 3, False),
    ("ana", "like", "rafael", 0, "Rafael Monteiro curtiu “Videocast: como a IA está mudando a Gestão de Pessoas”.", 1, False),
    ("ana", "comment", "bruno", 0, "Bruno Ferreira comentou em “Videocast: como a IA está mudando a Gestão de Pessoas”.", 0, False),
    ("ana", "episode", "rafael", 8, "Novo episódio de “Carreira em Foco”: Investimentos descomplicados para universitários", 4, True),
]


async def main() -> None:
    print("Limpando dados anteriores…")
    for name in COLLECTIONS:
        await db[name].delete_many({})
    await ensure_indexes()

    print("Criando categorias…")
    for name in CATEGORY_NAMES:
        slug = name.lower().replace(" ", "-").replace("ç", "c").replace("ã", "a").replace("á", "a").replace("ê", "e").replace("ó", "o").replace("ú", "u")
        await db.categories.insert_one({"id": str(uuid.uuid4()), "name": name, "slug": slug, "created_at": datetime.now(timezone.utc)})

    print("Criando usuários demo…")
    user_ids: dict[str, str] = {}
    users: dict[str, dict] = {}
    for spec in USERS:
        doc = {
            "id": str(uuid.uuid4()),
            "name": spec["name"],
            "email": spec["email"],
            "password_hash": hash_password(spec["password"]),
            "role": spec["role"],
            "bio": spec["bio"],
            "institution": spec["institution"],
            "area": spec["area"],
            "semester": spec["semester"],
            "avatar_url": "",
            "linkedin": "",
            "suspended": False,
            "created_at": datetime.now(timezone.utc) - timedelta(days=40),
        }
        user_ids[spec["key"]] = doc["id"]
        users[spec["key"]] = doc
        await db.users.insert_one(doc)

    print("Criando programas…")
    program_ids: dict[str, str] = {}
    for spec in PROGRAMS:
        host = users[spec["key_host"]]
        doc = {
            "id": str(uuid.uuid4()),
            "title": spec["title"],
            "description": spec["description"],
            "cover_url": spec["cover_url"],
            "host_id": user_ids[spec["key_host"]],
            "created_at": datetime.now(timezone.utc) - timedelta(days=30),
        }
        program_ids[spec["key"]] = doc["id"]
        await db.programs.insert_one(doc)

    print("Criando conteúdos…")
    pubs = build_publications(user_ids, users, program_ids)
    for doc in pubs:
        await db.publications.insert_one(doc)

    print("Criando comentários…")
    comment_ids: list[str] = []
    for pub_idx, author_key, text, parent_idx, days_ago in COMMENTS_SPEC:
        author = users[author_key]
        parent_id = comment_ids[parent_idx] if parent_idx is not None and parent_idx < len(comment_ids) else None
        doc = {
            "id": str(uuid.uuid4()),
            "publication_id": pubs[pub_idx]["id"],
            "parent_id": parent_id,
            "author_id": user_ids[author_key],
            "author_name": author["name"],
            "author_avatar": author["avatar_url"],
            "text": text,
            "likes_count": (parent_idx * 0) + 2 if parent_idx is not None else 3,
            "created_at": datetime.now(timezone.utc) - timedelta(days=days_ago, hours=5),
        }
        comment_ids.append(doc["id"])
        await db.comments.insert_one(doc)

    print("Criando curtidas, seguidores e notificações…")
    demo_keys = [s["key"] for s in USERS if s["role"] == "user"]
    for pub in pubs[:10]:
        for i, key in enumerate(demo_keys[: (pub["views"] % 4) + 2]):
            await db.likes.insert_one({
                "id": str(uuid.uuid4()), "user_id": user_ids[key], "target_id": pub["id"],
                "target_type": "publication", "created_at": datetime.now(timezone.utc) - timedelta(days=i),
            })
    for follower_key, target_key in FOLLOWS_SPEC:
        await db.follows.insert_one({
            "id": str(uuid.uuid4()), "follower_id": user_ids[follower_key],
            "target_id": user_ids[target_key], "target_type": "user",
            "created_at": datetime.now(timezone.utc) - timedelta(days=2),
        })
    await db.follows.insert_one({
        "id": str(uuid.uuid4()), "follower_id": user_ids["pedro"],
        "target_id": program_ids["p1"], "target_type": "program",
        "created_at": datetime.now(timezone.utc) - timedelta(days=2),
    })
    await db.follows.insert_one({
        "id": str(uuid.uuid4()), "follower_id": user_ids["rafael"],
        "target_id": program_ids["p1"], "target_type": "program",
        "created_at": datetime.now(timezone.utc) - timedelta(days=3),
    })

    for owner_key, ntype, actor_key, pub_idx, text, days_ago, is_read in NOTIFICATIONS_SPEC:
        actor = users[actor_key]
        pub = pubs[pub_idx] if pub_idx is not None else None
        await db.notifications.insert_one({
            "id": str(uuid.uuid4()), "user_id": user_ids[owner_key], "type": ntype,
            "actor_id": actor["id"], "actor_name": actor["name"], "actor_avatar": actor["avatar_url"],
            "publication_id": pub["id"] if pub else None,
            "publication_title": pub["title"] if pub else "",
            "text": text, "read": is_read,
            "created_at": datetime.now(timezone.utc) - timedelta(days=days_ago),
        })

    print("Seed concluído:")
    print(f"  {await db.users.count_documents({})} usuários")
    print(f"  {await db.publications.count_documents({})} publicações")
    print(f"  {await db.comments.count_documents({})} comentários")
    print(f"  {await db.programs.count_documents({})} programas")
    print("Logins demo: ana@demo.com / Demo@2025 · admin@administrase.com / Admin@2025")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())
