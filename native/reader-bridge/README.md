# NukeFire Native Reader bridge

Experimental Beta.83 native accessibility transport.

The Electron client launches a small isolated helper process. The helper uses
PRISM to talk directly to the user's running screen reader.

Prototype scope:
- Windows x64
- PRISM v0.18.2 pinned by tag
- NVDA first, JAWS second
- OUTPUT/SPEAK with explicit interrupt flag
- STOP and status
- no SAPI/OneCore fallback inside the helper
- Beta.82 ARIA fallback if helper/backend is unavailable

Build on Windows:

    npm run native-reader:win

The normal Windows distribution command builds the helper before electron-builder.

PRISM is MPL-2.0 software: https://github.com/ethindp/prism
The build stages PRISM's LICENSE, NOTICE, LICENSES directory and source pointer
beside the packaged helper.
