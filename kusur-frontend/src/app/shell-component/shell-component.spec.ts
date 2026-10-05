import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { GroupsService } from '../services/groups.service';
import { provideFakeGroupsApi } from '../testing/fake-groups-api';
import { ShellComponent } from './shell-component';

@Component({ template: '' })
class BlankPage {}

describe('ShellComponent', () => {
  let fixture: ComponentFixture<ShellComponent>;
  let refresh: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [provideRouter([{ path: 'groups', component: BlankPage }]), provideFakeGroupsApi()],
    }).compileComponents();

    refresh = vi.spyOn(TestBed.inject(GroupsService), 'refresh').mockImplementation(() => {});
    fixture = TestBed.createComponent(ShellComponent);
    await fixture.whenStable();
  });

  it('should render the routed page with the nav bar', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.shell-content router-outlet')).toBeTruthy();
    expect(el.querySelector('app-nav-bar-component')).toBeTruthy();
  });

  it('should refresh the groups on each page change', async () => {
    expect(refresh).not.toHaveBeenCalled();

    await TestBed.inject(Router).navigateByUrl('/groups');

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('should refresh the groups when the tab comes back into view', () => {
    const visibility = vi.spyOn(document, 'visibilityState', 'get');

    visibility.mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(refresh).not.toHaveBeenCalled();

    visibility.mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
