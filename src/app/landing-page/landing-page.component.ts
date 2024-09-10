import { Component } from '@angular/core';
import { banners } from '../banners';

@Component({
  selector: 'app-landing-page',
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.css'
})
export class LandingPageComponent {
  banners = [...banners];

  nextPage() {
    
  }
}
