import { DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { BalanceComponent } from '../balance-component/balance-component';
import { GroupsComponent } from '../groups-component/groups-component';

@Component({
  imports: [DatePipe,BalanceComponent, GroupsComponent],
  selector: 'app-home-component',
  styleUrl: './home-component.css',
  templateUrl: './home-component.html',
})
export class HomeComponent {
  today: number = Date.now();
}
