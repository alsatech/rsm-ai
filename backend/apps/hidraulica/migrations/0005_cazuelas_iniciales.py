from django.db import migrations

CAZUELAS = [
    # ROSITA (R)
    {"nombre": "Rcazuela1", "noria": "rosita", "lat": "29.47642764219509", "lng": "-101.5146372265926"},
    {"nombre": "Rcazuela2", "noria": "rosita", "lat": "29.46995871346132", "lng": "-101.5389423799286"},
    {"nombre": "Rcazuela3", "noria": "rosita", "lat": "29.46910998966587", "lng": "-101.5488630983305"},
    {"nombre": "Rcazuela4", "noria": "rosita", "lat": "29.47901349133886", "lng": "-101.55492203241"},
    {"nombre": "Rcazuela5", "noria": "rosita", "lat": "29.4828600570541", "lng": "-101.5679061580775"},
    {"nombre": "Rcazuela6", "noria": "rosita", "lat": "29.49007452214211", "lng": "-101.5659501640063"},
    {"nombre": "Rcazuela7", "noria": "rosita", "lat": "29.4964461961018", "lng": "-101.5638590191033"},
    {"nombre": "Rcazuela8", "noria": "rosita", "lat": "29.49900558696443", "lng": "-101.5742371040539"},
    {"nombre": "Rcazuela9", "noria": "rosita", "lat": "29.50002132860713", "lng": "-101.5832762801169"},
    {"nombre": "Rcazuela10", "noria": "rosita", "lat": "29.5040614972621", "lng": "-101.5725093458203"},
    {"nombre": "Rcazuela11", "noria": "rosita", "lat": "29.50564556603616", "lng": "-101.5624997152918"},
    {"nombre": "Rcazuela12", "noria": "rosita", "lat": "29.50593257386124", "lng": "-101.5538477316677"},
    # MARGARITAS (M)
    {"nombre": "Mcazuela1", "noria": "margaritas", "lat": "29.48795612755572", "lng": "-101.4870180893929"},
    {"nombre": "Mcazuela2", "noria": "margaritas", "lat": "29.4895480871162", "lng": "-101.4950031174874"},
    {"nombre": "Mcazuela3", "noria": "margaritas", "lat": "29.49589832076237", "lng": "-101.4828121339218"},
    {"nombre": "Mcazuela4", "noria": "margaritas", "lat": "29.47994991384074", "lng": "-101.499964058601"},
    {"nombre": "Mcazuela5", "noria": "margaritas", "lat": "29.48673238202331", "lng": "-101.5101382000729"},
    {"nombre": "Mcazuela6", "noria": "margaritas", "lat": "29.49470296027591", "lng": "-101.5194022887374"},
    {"nombre": "Mcazuela7", "noria": "margaritas", "lat": "29.50294463014498", "lng": "-101.499944192847"},
    {"nombre": "Mcazuela8", "noria": "margaritas", "lat": "29.48958582210467", "lng": "-101.5364750569825"},
    {"nombre": "Mcazuela9", "noria": "margaritas", "lat": "29.50811003637427", "lng": "-101.5359651625142"},
    {"nombre": "Mcazuela10", "noria": "margaritas", "lat": "29.51271773617394", "lng": "-101.5165540887583"},
    {"nombre": "Mcazuela11", "noria": "margaritas", "lat": "29.52453035292014", "lng": "-101.5071238551732"},
    {"nombre": "Mcazuela12", "noria": "margaritas", "lat": "29.52247087125509", "lng": "-101.4985086947682"},
    {"nombre": "Mcazuela13", "noria": "margaritas", "lat": "29.52137971365961", "lng": "-101.5130129433823"},
    {"nombre": "Mcazuela14", "noria": "margaritas", "lat": "29.53327345079548", "lng": "-101.5308237801182"},
    # CHAPOTE (C)
    {"nombre": "Ccazuela1", "noria": "chapote", "lat": "29.54645408329561", "lng": "-101.5628777980465"},
    {"nombre": "Ccazuela2", "noria": "chapote", "lat": "29.55082900614437", "lng": "-101.5668684611748"},
    {"nombre": "Ccazuela3", "noria": "chapote", "lat": "29.55754362194052", "lng": "-101.5422266930588"},
    {"nombre": "Ccazuela4", "noria": "chapote", "lat": "29.55053481816794", "lng": "-101.5267685852668"},
    {"nombre": "Ccazuela5", "noria": "chapote", "lat": "29.54198621199492", "lng": "-101.5813541207616"},
    {"nombre": "Ccazuela6", "noria": "chapote", "lat": "29.54256895768226", "lng": "-101.5935767208656"},
    {"nombre": "Ccazuela7", "noria": "chapote", "lat": "29.53164125376366", "lng": "-101.5776132814737"},
    {"nombre": "Ccazuela8", "noria": "chapote", "lat": "29.52604860250094", "lng": "-101.5709472767503"},
    {"nombre": "Ccazuela9", "noria": "chapote", "lat": "29.51708067909595", "lng": "-101.5689831301102"},
    {"nombre": "Ccazuela10", "noria": "chapote", "lat": "29.50918852920333", "lng": "-101.5786465995897"},
]


def crear_cazuelas(apps, schema_editor):
    Cazuela = apps.get_model('hidraulica', 'Cazuela')
    for datos in CAZUELAS:
        Cazuela.objects.create(**datos)


def eliminar_cazuelas(apps, schema_editor):
    Cazuela = apps.get_model('hidraulica', 'Cazuela')
    Cazuela.objects.filter(nombre__in=[datos['nombre'] for datos in CAZUELAS]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('hidraulica', '0004_cazuela'),
    ]

    operations = [
        migrations.RunPython(crear_cazuelas, eliminar_cazuelas),
    ]
