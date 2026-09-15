# Native runtime verification

The native gate consumes a generated Axiom snapshot and runs it in platform tooling. It is separate from `pnpm test:targets`, whose React Native checks compile JavaScript and export Hermes bundles. Generating a Kotlin or Swift file never changes a runtime result to passed.

## Run the gate

From the repository root with the pinned Node toolchain:

```sh
node scripts/native-verify.mjs probe
node scripts/native-verify.mjs prepare compose
node scripts/native-verify.mjs prepare swiftui
node scripts/native-verify.mjs compose
node scripts/native-verify.mjs swiftui
```

`probe` records tool locations and `NOT_RUN`. `prepare` writes a fresh generated consumer under `dist/native-verification/` and reports `PREPARED`; it does not execute native tools. A missing runtime prerequisite produces `BLOCKED`, exit code 2 and `nativeCompilation`/`nativeExecution: not-run`. Compilation or runtime assertion failure produces `FAILED`, exit code 1. Only completed native assertions produce `PASSED`.

The [Native Runtime workflow](../../.github/workflows/native.yml) runs both platform jobs for pull requests, main pushes and manual dispatch. Source generation uses the checked-in pnpm lock. Actions are pinned to exact commits resolved from their public repository tag references on 2026-09-15. The workflow does not publish a package, deploy an app or modify the user's design project.

## Android consumer

Supply JDK 17, Gradle 9.3.1, Android SDK 37 and build tools 36.0.0. Set `ANDROID_HOME` or `ANDROID_SDK_ROOT`; authorize exactly one connected Android device/emulator. CI provisions an API 35 Google APIs x86_64 Pixel 6 emulator. The captured device fingerprint and API describe the actual image; an API family is not an immutable system-image checksum.

The harness adds instrumentation configuration to the generated Android library without changing its emitted Kotlin sources. It compiles the library and test APK, then runs five Compose UI cases in `connectedDebugAndroidTest`:

1. A generated Button emits one native activation request and its disabled sibling is disabled.
2. A generated Checkbox emits a request while retaining its old controlled value, then reflects explicit consumer adoption.
3. A generated input accepts native edit actions and reflects the adopted text.
4. A generated Card mounts its required body content.
5. A generated Toast retains controlled open after a close request and removes its content after consumer adoption with reduced motion.

The result requires at least five JUnit cases, zero failures, zero errors and zero skipped cases. Compiler logs, actual JUnit XML, direct dependency pins, Gradle lock and dependency verification metadata are retained. The first platform resolution writes a **consumer lock artifact**, not a preapproved checked-in transitive dependency baseline; review and retain that lock before promoting a release profile. No full-catalog, TalkBack, physical-device or IME claim follows from these five cases.

The fixture uses the existing Compose BOM and test runner 1.7.0 / AndroidX JUnit extension 1.3.0. The instrumentation structure follows the official [Compose testing setup](https://developer.android.com/develop/ui/compose/testing) and [AndroidX Test releases](https://developer.android.com/jetpack/androidx/releases/test). AGP's Kotlin and Gradle compatibility follows the [AGP 9.1 release contract](https://developer.android.com/build/releases/agp-9-1-0-release-notes).

The first actual Android build exposed an incompatible candidate tuple: BOM 2026.08.00 resolves Compose 1.12.0, whose AAR metadata requires API37 and AGP9.1 or later. The corrected export uses AGP9.1.1, Gradle9.3.1 and compileSdk37 while retaining JDK17, Kotlin2.2.10, build-tools36.0.0 and minSdk26. Google's [SDK repository](https://dl.google.com/android/repository/repository2-3.xml) identifies the stable package as `platforms;android-37.0`; the [AGP9.1.1 POM](https://dl.google.com/dl/android/maven2/com/android/tools/build/gradle/9.1.1/gradle-9.1.1.pom) confirms built-in Kotlin2.2.10. Runtime success remains dependent on the corrected CI run.

## iOS simulator consumer

Supply macOS with Xcode, its iOS Simulator SDK and an installed iPhone simulator runtime matching that SDK version. The script records Xcode, Swift and SDK versions, compiles the unchanged generated SwiftUI source plus an independent UIKit-hosted consumer in Swift 6 language mode, signs the simulator app locally, and creates its own simulator matching the selected SDK. It installs and launches the app using `simctl`, and removes only the simulator it created. The native app atomically writes its runtime result in its own Documents directory; the host requires that result within 60 seconds and rejects a missing or failed result. Console attachment is not an execution gate.

The app mounts generated Button, input, Switch and Card controls in a real `UIHostingController`. Its assertions require rendered image output, different output after a consumer-owned state change, and different output after a light-to-dark appearance change. The native process returns image hashes and runtime results; a successful compiler exit alone cannot satisfy execution. The installed Xcode compiler is reported independently from the generator's Swift 6.3.3 candidate pin. A different observed compiler is exploratory execution evidence, not confirmation of that exact candidate profile.

This is **iOS Simulator execution on a macOS host**, not a macOS SwiftUI app, XCTest touch automation or a physical iPhone run. It does not verify VoiceOver, native keyboard, touch/focus behavior or Korean IME. Those require a separately scoped platform test plan. Apple's [command-line tooling guidance](https://developer.apple.com/library/archive/technotes/tn2339/_index.html) and [test result guidance](https://developer.apple.com/documentation/xcode/running-tests-and-interpreting-results) remain the reference for broader device test integration.

## Evidence and current local boundary

The iOS app writes its own runtime assertions to its app container; the host requires that result within a fixed deadline. Console attachment is not treated as proof of process completion. Command capture retains partial logs on failures and timeouts.

Every invocation writes `<target>-evidence.json` (or `host-probe-evidence.json`) and each prepared run has its own `native-evidence.json`. Evidence separates generated source digests from consumer-only additions; source files must remain byte-identical to their generated manifest. Command start/completion progress is emitted to stderr. Command output hashes, log files, timing, host and target context accompany outcomes, including bounded partial output on timeout or spawn failure. Neither a missing toolchain nor an unrun CI workflow is a pass.

The Windows host inspection on 2026-09-15 found no Java, Gradle, Android SDK/adb, Swift or Xcode in PATH, declared SDK environments or standard installation locations. No callable remote-shell connector was configured for the referenced Mac. Local fixture and probe tests pass; actual native results must come from an executed platform job. The latest successful job's artifact, exact source commit and observed toolchain are the authority for any later runtime claim.
