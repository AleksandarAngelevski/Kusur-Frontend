import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { GroupsService } from '../services/groups.service';

@Component({
  imports: [RouterLink, RouterLinkActive],
  selector: 'app-nav-bar-component',
  styleUrl: './nav-bar-component.css',
  templateUrl: './nav-bar-component.html',
})
export class NavBarComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  protected groups = inject(GroupsService);

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
