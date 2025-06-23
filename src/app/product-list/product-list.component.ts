import { MatTabsModule } from '@angular/material/tabs';
import { Product } from '../common/product';
import { Component, OnInit } from '@angular/core';
import { ProductService } from '../services/product.service';
import { GroupedCategory } from '../common/grouped.category';


@Component({
  selector: 'app-product-list',
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.css'],
  
})
export class ProductListComponent implements OnInit {
  groupedItems: GroupedCategory[] = [];

  constructor(private productService: ProductService) { }

  ngOnInit() {
    this.groupedItems = this.productService.loadCategories();
  }

  share() {
    window.alert('The product has been shared!');
  }
}
