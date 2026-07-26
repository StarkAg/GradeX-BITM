import React from 'react';
import { AuthenticateWithRedirectCallback } from '@clerk/clerk-react';

export default function AuthRedirectCallback() {
  return (
    <AuthenticateWithRedirectCallback
      signInUrl="/"
      signUpUrl="/"
      continueSignUpUrl="/"
      firstFactorUrl="/"
      secondFactorUrl="/"
      resetPasswordUrl="/"
      verifyEmailAddressUrl="/"
      verifyPhoneNumberUrl="/"
    />
  );
}
