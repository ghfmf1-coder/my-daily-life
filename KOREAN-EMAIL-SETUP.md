# 하루한칸: Supabase 이메일 알림을 한국어로 바꾸기

> 앱의 화면 안내문은 GitHub에서 이미 존댓말로 수정됐습니다.
> 다만 Supabase가 **실제로 보내는 이메일**은 Supabase 관리 화면에서 별도로 수정해야 합니다.

## 직접 설정하기

1. [하루한칸 Supabase 이메일 템플릿](https://supabase.com/dashboard/project/ytifxhpizractdeytrok/auth/templates)을 엽니다.
2. **Confirm sign up**(가입 확인)을 선택합니다.
3. Subject(제목)를 다음과 같이 변경합니다: `[하루한칸] 이메일 인증을 완료해 주세요`
4. Body(본문) 또는 HTML Content에 [confirm-signup.html](./emails/confirm-signup.html)의 **전체 HTML**을 붙여넣습니다.
5. **Save changes**를 누르고, 새 이메일 주소로 가입 테스트를 진행합니다.

## 다른 자동 메일도 한국어로 통일하려면

| Supabase 템플릿 | 메일 제목 | HTML 파일 |
| --- | --- | --- |
| Confirm sign up | [하루한칸] 이메일 인증을 완료해 주세요 | [confirm-signup.html](./emails/confirm-signup.html) |
| Reset password | [하루한칸] 비밀번호를 재설정해 주세요 | [reset-password.html](./emails/reset-password.html) |
| Magic link | [하루한칸] 로그인 링크를 보내드립니다 | [magic-link.html](./emails/magic-link.html) |
| Invite user | [하루한칸] 초대 안내 | [invite-user.html](./emails/invite-user.html) |
| Change email address | [하루한칸] 이메일 주소 변경을 확인해 주세요 | [change-email.html](./emails/change-email.html) |
| Reauthentication | [하루한칸] 본인 확인 코드 안내 | [reauthentication.html](./emails/reauthentication.html) |

**중요:** `{{ .ConfirmationURL }}` 및 `{{ .Token }}`과 같은 Supabase 변수를 지우거나 바꾸지 마세요. 해당 값이 인증 링크/코드로 자동 치환됩니다.

## 발신자 표시

제목과 본문을 한국어로 바꿔도 기본 발신자는 `Supabase Auth`로 보일 수 있습니다.
발신자 이름/메일 주소까지 자체 브랜드로 바꾸려면 별도 SMTP 공급자 설정이 필요합니다.

## 테스트할 내용

- 가입 메일 제목과 본문이 한국어인지
- **이메일 인증하기** 버튼이 실제 동작하는지
- 인증 후 https://ghfmf1-coder.github.io/my-daily-life/app/ 로 복귀하는지
- 비밀번호 재설정 메일도 정상 발송되는지

공식 문서: https://supabase.com/docs/guides/auth/auth-email-templates
