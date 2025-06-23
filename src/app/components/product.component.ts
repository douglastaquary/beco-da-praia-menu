import { Component } from '@angular/core';
import { Product } from '../common/product';

@Component({
  selector: 'product-component',
  templateUrl: './product.component.html',
  styleUrls: ['./product.component.css']
})
export class ProducComponent {

  product: Product | undefined;

}