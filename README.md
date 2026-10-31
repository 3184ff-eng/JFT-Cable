# JFT cable

This project runs the existing HTTP source resolver in a manually triggered GitHub Actions job, publishes one refreshed movie in a GitHub Pages JSON feed, and lets the Roku pull that feed. It is not an on-demand server or a browser running on Roku. GitHub-to-home playback is unverified. TV episode extraction is not implemented.

## Publish and test

1. Push this directory to the chosen GitHub repository. The `roku/` folder contains the app source and precompiled experimental TypeScript module. No user account credentials or GitHub tokens belong in the repository.
2. In repository Settings > Pages, select GitHub Actions as the source. The resulting feed is publicly accessible; temporary stream URLs in it are visible to visitors. Use this only for sources you intend to expose this way.
3. Run Actions > Refresh JFT cable test source > Run workflow. Start with the default Spider-Man page. This performs one attempt, with no retries or rate-limit evasion. It may fail due to provider verification, blocking, or timeouts. A failed provider refresh publishes a feed with no playable URLs, then marks the job failed.
4. Install `jft-cable-roku.zip` on the Roku developer installer. This replaces the current sideloaded app.
5. Choose GitHub feed address. Enter the deployed Pages URL ending in `/feed.json`. Use the actual URL shown by the deployment job rather than guessing a username or path.
6. The app loads the feed. Choose the test movie and Play within ten minutes of the source check. Report the exact playback result. The workflow checks the master playlist, variant and a small video-segment range from the GitHub runner; this does not prove your Roku can access them.
7. For another attempt, rerun the workflow, then select Refresh GitHub feed in the app. No workflow credentials are placed in the Roku app.

## Behaviour and limits

Feed links expire after at most ten minutes, or earlier if the CDN expiry indicates that. The Roku checks expiry at selection and ignores pre-existing saved source URLs while a feed is configured. Playback already in progress may outlast this feed window. A successful HTTP response is not proof of video compatibility. Provider IP/session restrictions can make this architecture unusable even when a GitHub job succeeds. Scheduling a full catalogue is deliberately deferred until one actual home-device test passes.

The existing native resolver remains experimental. GitHub feed operations use a BrightScript Task and do not require the native resolver to generate a source. The package still includes its existing TypeScript anchor and requires the same device runtime support as v1.8.

## Verification

`npm test` checks that old URLs are removed, expiry is bounded, and expired/insecure sources are rejected. Roku BrightScript compilation is checked separately. No GitHub deployment or physical-device playback has been verified in this change.
