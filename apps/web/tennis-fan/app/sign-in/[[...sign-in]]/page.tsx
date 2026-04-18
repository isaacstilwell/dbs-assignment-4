import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <SignIn />
    </div>
  )
}
