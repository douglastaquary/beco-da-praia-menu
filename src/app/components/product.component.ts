import { Component } from '@angular/core';
import { Product } from '../products';

@Component({
  selector: 'product-component',
  templateUrl: './product.component.html',
  styleUrls: ['./product.component.css']
})
export class ProducComponent {

  product: Product | undefined;

}