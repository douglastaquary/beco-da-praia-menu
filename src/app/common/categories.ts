import { GroupedCategory } from '../common/grouped.category';

  export const categories: GroupedCategory[] = [
    {
      id: 1,
      category: 'Entradinhas',
      description: 'Que tal pedir uma entradinha só pra dar aquela despertada no apetite?',
      products: [
        {
          id: '1',
          name: 'Casquinha de Siri',
          description: 'Saborear uma casquinha de siri no Beco da Praia é cremosa por dentro e cheia de tempero caseiro.',
          price: 22,
          image_name: "",
        },
        {
          id: '2',
          name: 'Pastelzinho de carne seca com abobora',
          description: 'Pastelzinho crocante recheado com carne seca desfiada e creme de abóbora bem temperadinho.',
          price: 25,
          image_name: "",
        },
        {
          id: '3',
          name: 'Torresmo (unidade)',
          description: 'Barra de torresmo crocante por fora, suculenta por dentro — aquele estouro de sabor que derrete na boca e faz qualquer um salivar.',
          price: 6,
          image_name: "Torresmo-de-Barriga.jpeg",
        },
        {
          id: '4',
          name: 'Queijo coalho',
          description: 'Deliciosos pedações de queijo coalho assado acompanhado com mel de abelha.',
          price: 24,
          image_name: "caldo-de-mocoto.png",
        },
        {
          id: '5',
          name: 'Mix de pasteizinhos',
          description: '4 pasteizinhos crocantes de carne seca com abobora, queijo e calabresa com queijo',
          price: 30,
          image_name: "",
        }
      ]
    },
    {
      id: 1,
      category: 'Caldos',
      description: 'Nesse frio, um caldo verde quentinho é abraço em forma de sabor!',
      products: [
        {
          id: '1',
          name: 'Caldo de carne seca com abobora',
          description: 'Vem se esquentar com um caldo de carne seca com abóbora, puro aconchego em cada colherada! Acompanha pão fatiado.',
          price: 22,
          image_name: "",
        },
        {
          id: '2',
          name: 'Caldo verde',
          description: 'Caldo verde quentinho te esperando — sabor que aquece até a alma! Acompanha pão fatiado.',
          price: 22,
          image_name: "",
        }
      ]
    },
    {
      id: 1,
      category: 'Pratos para compartilhar',
      description: 'Perfeitos para dividir com quem você gosta — nossas opções de pratos para compartilhar reúnem sabor, generosidade e aquele clima de mesa cheia e feliz.',
      products: [
        {
          id: '1',
          name: 'Trio Nordestino (Serve 2 pessoas)',
          description: 'Vem matar a fome com sabor nordestino: baião de dois misturado com calabrea e bacon, mandioca cozida na manteiga e carne de sol acebolada te esperando quentinho e irresistível!',
          price: 95,
          image_name: "",
        },
        {
          id: '2',
          name: 'Baião de dois (Serve 4 pessoas)',
          description: '1,5 kg do famoso arroz com feijão, incrementado com calabresa, bacon, queijo coalho finalizado com cheiro verde. Serve 4 pessoas',
          price: 85,
          image_name: "baiao-de-dois.jpeg",
        },
        {
          id: '3',
          name: 'Tainha frita',
          description: 'Bucho em tirinhas, feijão branco, calabresa e bacon. Acompanha arroz branco.',
          price: 25,
          image_name: "dobradinha-oficial.jpeg",
        }
      ]
    },
    {
      id: 2,
      category: 'Pratos individuais',
      description: 'O prato individuais é uma refeição completa e saborosa: arroz soltinho, acompanhado de um delicioso feijão (carioca), farofa e batata ou manioca frita.',
      products: [
        {
          id: '1',
          name: 'Maria Bonita',
          description: 'Baião de dois com calabresa, bacon, queijo coalho, carne de sol feita artesanalmente na casa e farofa. Acompanha mandioca frita.',
          price: 45,
          image_name: "maria_bonita.png",
        },
        {
          id: '2',
          name: 'Carne de sol acebolada',
          description: 'Arroz branco, carne de sol feita na casa acebolada, mandioca frita, feijão e farofa.',
          price: 38,
          image_name: "executivo_carne_de_sol.png",
        },
        {
          id: '3',
          name: 'Peixe com molho de camarão',
          description: 'Arroz branco, peixe empanado na farinha panko, regado com um delicioso molho de camarão. Acompanha mandioca frita, feijão e farofa.',
          price: 39,
          image_name: "Torresmo-de-Barriga.jpeg",
        },
        {
          id: '4',
          name: 'Bife acebolado',
          description: 'Arroz branco, bife acebolado, batata frita, feijão e farofa.',
          price: 37,
          image_name: "",
        },
        {
          id: '5',
          name: 'Frango grelhado',
          description: 'Arroz branco, um suculento frango grelhado, batata frita, feijão e farofa.',
          price: 27,
          image_name: "Torresmo-de-Barriga.jpeg",
        },
        {
          id: '6',
          name: 'Dobradinha com arroz',
          description: 'Deliciosa dobradinha misturada com feijão branco, calabresa e bacon. Acompanha arroz branco e farinha.',
          price: 27,
          image_name: "",
        },
        {
          id: '7',
          name: 'Mocotó com arroz',
          description: 'Delicioso e suculento mocotó cozido acompanhado com arroz branco e farinha.',
          price: 27,
          image_name: "",
        },
        {
          id: '8',
          name: 'Frango crocante',
          description: 'Arroz branco, franco empanado na farinha panko, batata frita, feijão e farofa.',
          price: 28,
          image_name: "",
        }
      ]
    },
    {
      id: 1,
      category: 'Porções',
      description: 'Refeição feita para beliscar com os amigos e deixar fluir a resenha. Meia porção para 2 pessoas e as inteiras que serve até 4 pessoas.',
      products: [
        {
          id: '1',
          name: 'Porção de carne acebolada',
          description: 'Que tal saborear tirinhas de carnes macias e suculentas acompanhado de batata ou mandioca frita.',
          price: 47,
          image_name: "",
        },
        {
          id: '2',
          name: 'Porção de isca de peixe crocante',
          description: 'Suculentas tirinhas de peixe crocante acompanhado de batata ou mandioca frita.',
          price: 47,
          image_name: "baiao-de-dois.jpeg",
        },
        {
          id: '3',
          name: 'Porção de mix de churrasco',
          description: 'Uma deliciosa combinação de calabresa e carne. Acompanha batata frita ou mandioca frita.',
          price: 25,
          image_name: "",
        }
      ]
    }
  ];