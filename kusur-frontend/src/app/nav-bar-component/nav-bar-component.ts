import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  imports: [],
  selector: 'app-nav-bar-component',
  styleUrl: './nav-bar-component.css',
  templateUrl: './nav-bar-component.html',
})
export class NavBarComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
