// Maps Line Number (DC-TZxx) to KML Filename
export const LINE_KML_MAPPING: Record<string, string> = {
    'DC-TZ01': 'DC_598.kml',
    'DC-TZ02': 'DC_555.kml',
    'DC-TZ03': 'DC_532.kml',
    'DC-TZ04': 'DC_600.kml',
    'DC-TZ05': 'DC_537.kml',
    'DC-TZ06': 'DC_549.kml',
    'DC-TZ07': 'DC_526.kml',
    'DC-TZ08': 'DC_527.kml',
    'DC-TZ09': 'DC_550.kml',
    'DC-TZ10': 'DC_535.kml',
    'DC-TZ11': 'DC_554.kml',
    'DC-TZ12': 'DC_539.kml',
    'DC-TZ13': 'DC_547.kml',
    'DC-TZ14': 'DC_533.kml',
    'DC-TZ15': 'DC_524.kml',
    'DC-TZ16': 'DC_559.kml',
    'DC-TZ17': 'DC_553.kml',
    'DC-TZ18': 'DC_595.kml',
    'DC-TZ19': 'DC_545.kml',
    'DC-TZ20': 'DC_577.kml'
};

export const LINE_NAMES: Record<string, string> = {
    'DC-TZ01': 'Capivari x Figueira',
    'DC-TZ02': 'Aviário x Xerém',
    'DC-TZ03': 'Parque Eldorado x Xerém (via Cantão)',
    'DC-TZ04': 'Vila Operária x Hosp. Daniel Lipp',
    'DC-TZ05': 'Vila Maria Helena x Parque Equitativa',
    'DC-TZ06': 'Jardim Primavera x Bom Retiro',
    'DC-TZ07': 'Jardim Gramacho x Hosp. Moacyr do Carmo',
    'DC-TZ08': 'Jardim Anhangá x Santa Cruz da Serra',
    'DC-TZ09': 'Vila Canaan x Santa Cruz da Serra',
    'DC-TZ10': 'Santo Antônio x Xerém',
    'DC-TZ11': 'Xerém x Tinguá',
    'DC-TZ12': 'Saracuruna x Jardim Ana Clara',
    'DC-TZ13': 'Jardim Primavera x Hosp. Adão Pereira Nunes',
    'DC-TZ14': 'Saraiva x Jardim Primavera',
    'DC-TZ15': 'Pilar x Cidade dos Meninos',
    'DC-TZ16': 'Parque das Missões x Hosp. Moacyr do Carmo',
    'DC-TZ17': 'Vila do Sase x Garrão',
    'DC-TZ18': 'Pilar x Cangulo (via Reduc)',
    'DC-TZ19': 'Santa Cruz da Serra x Taquara',
    'DC-TZ20': 'Parque Beira Mar x Estação Duque de Caxias'
};

export const IGNORED_LINES = [
    'DC-01', 'DC-02', 'DC-03', 'DC-04', 'DC-05', 'DC-06', 'DC-Apoio', 'Linha DC-Apoio'
];

export const MAP_CENTER: [number, number] = [-22.7858, -43.3077];
export const ZOOM_LEVEL = 12;
