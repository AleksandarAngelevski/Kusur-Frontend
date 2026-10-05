import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { NavBarComponent } from './nav-bar-component';

describe('NavBarComponent', () => {
  let component: NavBarComponent;
  let fixture: ComponentFixture<NavBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavBarComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(NavBarComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => localStorage.removeItem('token'));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should clear the token and go to the login page when Log out is clicked', () => {
    const auth = TestBed.inject(AuthService);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    auth.token.set('some.jwt.token');
    localStorage.setItem('token', 'some.jwt.token');

    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    expect(button.textContent).toContain('Log out');
    button.click();

    expect(auth.isLoggedIn()).toBe(false);
    expect(localStorage.getItem('token')).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});
