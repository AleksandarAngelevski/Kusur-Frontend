import { DecimalPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { GroupsService } from '../services/groups.service';

@Component({
  imports: [DecimalPipe],
  selector: 'app-balance-component',
  styleUrl: './balance-component.css',
  templateUrl: './balance-component.html',
})
export class BalanceComponent {
  private service = inject(GroupsService);

  /** totals across groups and friends: what I'm owed where I'm ahead, and what I owe in the rest */
  owedBalance = computed(() => this.sum((balance) => balance > 0));
  oweBalance = computed(() => -this.sum((balance) => balance < 0));
  netBalance = computed(() => this.owedBalance() - this.oweBalance());

  private sum(include: (balance: number) => boolean): number {
    return [...this.service.groups(), ...this.service.friends()]
      .filter((group) => include(group.balance))
      .reduce((total, group) => total + group.balance, 0);
  }
}
