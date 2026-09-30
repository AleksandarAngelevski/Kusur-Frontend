import { DecimalPipe } from '@angular/common';
import { Component, computed, signal } from '@angular/core';

@Component({
  imports: [DecimalPipe],
  selector: 'app-balance-component',
  styleUrl: './balance-component.css',
  templateUrl: './balance-component.html',
})
export class BalanceComponent {
  owedBalance = signal(1241);
  oweBalance = signal(50000);
  netBalance = computed(() => this.owedBalance() - this.oweBalance());
}
