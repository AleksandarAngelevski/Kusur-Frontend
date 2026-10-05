import { Component, HostListener, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { NavBarComponent } from '../nav-bar-component/nav-bar-component';
import { GroupsService } from '../services/groups.service';

/**
 * Frame for the signed-in pages: the routed page with the nav bar underneath.
 * It also keeps the groups fresh, refetching them on each page change and when the tab is
 * looked at again, so one member sees what another has added.
 */
@Component({
  imports: [RouterOutlet, NavBarComponent],
  selector: 'app-shell-component',
  styleUrl: './shell-component.css',
  templateUrl: './shell-component.html',
})
export class ShellComponent {
  protected groups = inject(GroupsService);

  constructor() {
    inject(Router).events
      .pipe(filter((event) => event instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => this.groups.refresh());
  }

  @HostListener('document:visibilitychange')
  onVisibilityChange(): void {
    if (document.visibilityState === 'visible') {
      this.groups.refresh();
    }
  }

  retry(): void {
    this.groups.load().subscribe();
  }
}
