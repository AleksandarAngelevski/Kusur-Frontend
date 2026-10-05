import { Component, computed, inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { GroupsService } from '../services/groups.service';

@Component({
  imports: [],
  selector: 'app-profile-component',
  styleUrl: './profile-component.css',
  templateUrl: './profile-component.html',
})
export class ProfileComponent {
  private auth = inject(AuthService);
  protected user = inject(GroupsService).currentUser;

  /** the backend's answer when it has loaded, otherwise what the token says */
  username = computed(() => this.user()?.username ?? this.auth.username() ?? 'Unknown');
}
