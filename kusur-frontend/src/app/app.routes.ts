import { Routes } from '@angular/router';
import { HomeComponent } from './home-component/home-component';
import { LoginComponent } from './login-component/login-component';
import { ForgotPasswordComponent } from './forgot-password-component/forgot-password-component';
import { RegisterComponent } from './register-component/register-component';
import { ResetPasswordComponent } from './reset-password-component/reset-password-component';
import { authGuard, guestGuard } from './shared/auth.guard';


export const routes: Routes = [
    {
        path: '',
        component: HomeComponent,
        canActivate: [authGuard]
    },
    {
        path: 'login',
        component: LoginComponent,
        canActivate: [guestGuard]
    },
    {
        path: 'register',
        component: RegisterComponent,
        canActivate: [guestGuard]
    },
    {
        path: 'forgot-password',
        component: ForgotPasswordComponent,
        canActivate: [guestGuard]
    },
    {
        // no guard: the emailed link has to work whether or not this browser is signed in
        path: 'reset-password',
        component: ResetPasswordComponent
    }
];
