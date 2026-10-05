import { Routes } from '@angular/router';
import { HomeComponent } from './home-component/home-component';
import { LoginComponent } from './login-component/login-component';
import { authGuard } from './shared/auth.guard';


export const routes: Routes = [
    {
        path: '',
        component: HomeComponent,
        canActivate: [authGuard]
    },
    {
        path: 'login',
        component: LoginComponent
    }
];
