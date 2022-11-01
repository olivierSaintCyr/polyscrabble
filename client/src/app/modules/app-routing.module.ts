import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from '@app/guards/auth.guard';
import { AccountPageComponent } from '@app/pages/account-page/account-page.component';
import { GamePageComponent } from '@app/pages/game-page/game-page.component';
import { HomepageComponent } from '@app/pages/homepage/homepage.component';
import { LoginPageComponent } from '@app/pages/login-page/login-page.component';
import { NewGamePageComponent } from '@app/pages/new-game-page/new-game-page.component';
import { PrototypePageComponent } from '@app/pages/prototype-page/prototype-page.component';
import { RegisterPageComponent } from '@app/pages/register-page/register-page.component';

export const routes: Routes = [
    { path: '', redirectTo: '/home', pathMatch: 'full' },
    { path: 'home', component: HomepageComponent, canActivate: [AuthGuard] },
    { path: 'new-game', component: NewGamePageComponent, canActivate: [AuthGuard] },
    { path: 'leaderboard', component: HomepageComponent, canActivate: [AuthGuard] },
    { path: 'game', component: GamePageComponent, canActivate: [AuthGuard] },
    { path: 'prototype', component: PrototypePageComponent, canActivate: [AuthGuard] },
    { path: 'login', component: LoginPageComponent },
    { path: 'register', component: RegisterPageComponent },
    { path: 'account', component: AccountPageComponent, canActivate: [AuthGuard] },
    { path: '**', redirectTo: '/home' },
];

@NgModule({
    imports: [RouterModule.forRoot(routes, { useHash: true })],
    exports: [RouterModule],
})
export class AppRoutingModule {}
