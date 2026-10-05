import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ShellComponent } from './shell-component';

describe('ShellComponent', () => {
  let fixture: ComponentFixture<ShellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ShellComponent);
    await fixture.whenStable();
  });

  it('should render the routed page with the nav bar', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.shell-content router-outlet')).toBeTruthy();
    expect(el.querySelector('app-nav-bar-component')).toBeTruthy();
  });
});
