export interface Product {
    id: number;
    name: string;
    price: number;
    description: string;
    image_name: string;
  }
  
  export const products = [
    {
      id: 1,
      name: 'Maria Bonita',
      price: 45,
      description: 'Baião de dois, calabresa, bacon, queijo coalho. Acompanha carne de sol artesanal de filé mignon e mandioca frita.',
      image_name: "maria_bonita.png",
    },
    {
      id: 2,
      name: 'Torresmo',
      price: 23,
      description: 'Torresminhos de panceta do Beco, picadinhos e sequinhos. Acompanha limão.',
      image_name: "Torresmo-de-Barriga.jpeg",
    },
    {
      id: 3,
      name: 'Torresmo',
      price: 23,
      description: 'Torresminhos de panceta do Beco, picadinhos e sequinhos. Acompanha limão.',
      image_name: "Torresmo-de-Barriga.jpeg",
    }
  ];