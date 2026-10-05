import { Component, inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

@Component({
  imports: [],
  selector: 'app-profile-component',
  styleUrl: './profile-component.css',
  templateUrl: './profile-component.html',
})
export class ProfileComponent {
  protected auth = inject(AuthService);
}
