import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavBarComponent } from '../nav-bar-component/nav-bar-component';
import { GroupsService } from '../services/groups.service';

/** Frame for the signed-in pages: the routed page with the nav bar underneath. */
@Component({
  imports: [RouterOutlet, NavBarComponent],
  selector: 'app-shell-component',
  styleUrl: './shell-component.css',
  templateUrl: './shell-component.html',
})
export class ShellComponent {
  protected groups = inject(GroupsService);

  retry(): void {
    this.groups.load().subscribe();
  }
}
