window.BECO_ORDERS_API_BASE_URL = window.BECO_ORDERS_API_BASE_URL || 'https://82x7kkich5.execute-api.us-east-1.amazonaws.com';
window.BECO_ONLINE_ORDERS_ENABLED = false;

window.BECO_LAYOUT_V2 = {
    enabledByDefault: true,
    enabledByQuery: 'layout=v2',
    disabledByQuery: 'layout=classic',
    heroAutoplayMs: 5500,
    groups: {
        cardapio: [
            'mais-pedidos',
            'combos',
            'entradinhas',
            'porcoes-do-beco',
            'bem-nordestinos',
            'pratos-executivos',
            'pasteis-gigantes-20-cm',
            'sobremesas',
            'cachacas-do-beco'
        ],
        cervejas: ['cervejas'],
        caipirinhas: [
            'caipirinhas-do-beco',
            'coqueteis'
        ],
        'sem-alcool': [
            'agua-e-refrigerantes',
            'sucos'
        ],
        cachacas: ['cachacas-do-beco'],
        forro: [
            'forro-destaques',
            'caipirinhas-do-beco',
            'entradinhas',
            'porcoes-do-beco',
            'bem-nordestinos',
            'cervejas'
        ]
    }
};
