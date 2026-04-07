import { inject, Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { catchError, finalize, EMPTY } from 'rxjs';
import { GetAdminProfileUseCase } from '../use-cases/get-admin-profile.use-case';
import { UpdateAdminProfileUseCase } from '../use-cases/update-admin-profile.use-case';
import { AdminProfile, ProfileUpdateData } from '../../domain/models/admin-profile.model';

@Injectable({ providedIn: 'root' })
export class AdminProfileFacade {
  private getProfileUseCase   = inject(GetAdminProfileUseCase);
  private updateProfileUseCase = inject(UpdateAdminProfileUseCase);

  readonly profile$ = new BehaviorSubject<AdminProfile | null>(null);
  readonly loading$ = new BehaviorSubject<boolean>(false);
  readonly error$   = new BehaviorSubject<string | null>(null);

  loadProfile(): void {
    this.loading$.next(true);
    this.error$.next(null);

    this.getProfileUseCase.execute().pipe(
      catchError((err: unknown) => {
        const message = this.extractErrorMessage(err);
        this.error$.next(message);
        return EMPTY;
      }),
      finalize(() => this.loading$.next(false))
    ).subscribe(profile => this.profile$.next(profile));
  }

  updateProfile(data: ProfileUpdateData): void {
    this.loading$.next(true);
    this.error$.next(null);

    this.updateProfileUseCase.execute(data).pipe(
      catchError((err: unknown) => {
        const message = this.extractErrorMessage(err);
        this.error$.next(message);
        return EMPTY;
      }),
      finalize(() => this.loading$.next(false))
    ).subscribe(updated => this.profile$.next(updated));
  }

  clearError(): void {
    this.error$.next(null);
  }

  private extractErrorMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (typeof err === 'object' && err !== null && 'message' in err) {
      return String((err as { message: unknown }).message);
    }
    return 'Error desconocido. Intente nuevamente.';
  }
}
