import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Product } from '../common/product';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { products } from '../common/products'
import { GroupedCategory } from '../common/grouped.category';
import { categories } from '../common/categories';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  products: Product[] = [];
  groupedItems: GroupedCategory[] = [];

  private baseUrl = 'http://localhost:8080/api/products';

  constructor() {}

  // getProductList(): Observable<Product[]> {
  //   return this.httpClient.get<GetResponse>(this.baseUrl).pipe(
  //     map(response => response._embedded.products)
  //   );
  // }

  // private loadItems(): Product[]  {
  //   return products; 
  // }

  loadCategories(): GroupedCategory[]  {
    return categories; 
  }

  // groupItemsByCategory(){
  //   const groupedObject = products.reduce((acc, item) => {
  //     if (!acc[item.categoryName]) {
  //       acc[item.categoryName] = [];
  //     }
  //     acc[item.categoryName].push(item);
  //     return acc;
  //   }, {} as { [key: string]: Product[] });

  //   this.groupedItems = Object.keys(groupedObject).map(category => ({
  //     category: category,
  //     items: groupedObject[category]
  //   }));

  // }
}

interface GetResponse {
  _embedded: {
    products: Product[];
  }
}


