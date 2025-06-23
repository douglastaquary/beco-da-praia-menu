import { Product } from '../common/product';
  
  export const products = [
    {
      id: '1',
      name: 'Maria Bonita',
      description: 'Baião de dois, calabresa, bacon, queijo coalho. Acompanha carne de sol artesanal de filé mignon e mandioca frita.',
      price: 45,
      image_name: "maria_bonita.png",
      category: {
        id: 1,
        categoryName: 'Pratos executivos',
        description: "O prato feito é uma refeição completa e saborosa, perfeita para satisfazer a fome do dia a dia (1 pessoa). Ele onsiste em arroz branquíssimo, soltinho, acompanhado de um delicioso feijão (carioca) que traz um toque caseiro."
      }
    },
    {
      id: '2',
      name: 'Torresmo',
      description: 'Torresminhos de panceta do Beco, picadinhos e sequinhos. Acompanha limão.',
      price: 23,
      image_name: "Torresmo-de-Barriga.jpeg",
      category: {
        id: 2,
        categoryName: 'Culinária nordestina',
        description: 'Pratos típicos nordestinos feito com muito sabor, bem temperado, e com fartura e apreço para lembrar da terrinha!'
      }
    },
    {
      id: 3,
      name: 'Baião de dois',
      description: '900g do famoso arroz com feijão, incrementado com calabresa, bacon, queijo coalho finalizado com cheiro verde. "Não podemos retirar os ingredientes."',
      price: 65,
      image_name: "baiao-de-dois.jpeg",
      category: {
        id: 2,
        categoryName: 'Culinária nordestina',
        description: 'Pratos típicos nordestinos feito com muito sabor, bem temperado, e com fartura e apreço para lembrar da terrinha!'
      }
    }
  ];