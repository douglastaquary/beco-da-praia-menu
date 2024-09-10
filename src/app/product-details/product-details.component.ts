import { Component, OnInit, Input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { Product, products } from '../products';
import { MatIconModule } from '@angular/material/icon';


@Component({
  selector: 'app-product-details',
  templateUrl: './product-details.component.html',
  styleUrl: './product-details.component.css',
  
})
export class ProductDetailsComponent implements OnInit {
  
  @Input() product: Product | undefined;
  
  constructor(private route: ActivatedRoute, private location: Location) { }

  ngOnInit() {
    // First get the product id from the current route.
    const routeParams = this.route.snapshot.paramMap;
    const productIdFromRoute = Number(routeParams.get('productId'));
  
    // Find the product that correspond with the id provided in route.
    this.product = products.find(product => product.id === productIdFromRoute);
  }


  goBack() {
    // window.history.back();
    this.location.back();

    console.log( 'goBack()...' );
  }

}
