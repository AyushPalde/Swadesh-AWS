# Firebase Auth migration (SWADESH)

- Frontend sign-in/sign-up uses Firebase Email/Password.
- The frontend sends the Firebase ID token as `Authorization: Bearer <token>`.
- Lambda verifies the ID token against `FIREBASE_PROJECT_ID` using `google-auth-library`.
- The users table key is the Firebase UID (`userId`).
- New accounts are always created as `citizen`. Never accept a role from the browser.
- To grant authority access, first have the person register/sign in, then update that user's DynamoDB `swadesh-users` item so `role` is exactly `authority`. Keep `userId` equal to the Firebase UID.

Required Lambda environment variables:
- `ISSUES_TABLE`
- `USERS_TABLE`
- `IMAGE_BUCKET`
- `FIREBASE_PROJECT_ID`
- `DATA_STORE=dynamo`
- `S3_MODE=aws`
- `LOG_LEVEL=INFO`
- `AWS_REGION=us-east-1` (optional; defaults to us-east-1)

`JWT_SECRET` and `AUTHORITY_PASSCODE` are no longer used by this Firebase version.
