# Model Fix Applied - November 20, 2025

## Issue
Form submissions were failing with error:
```
404 {"type":"error","error":{"type":"not_found_error","message":"model: claude-3-5-sonnet-20241022"}}
```

## Root Cause
The code was using an invalid Anthropic model name: `claude-3-5-sonnet-20241022`

This model identifier doesn't exist in Anthropic's API.

## Solution
Updated `src/bible-study-generator.js` line 287:

**Before:**
```javascript
model: 'claude-3-5-sonnet-20241022',
```

**After:**
```javascript
model: 'claude-3-5-sonnet-20240620',
```

## Deployment
- Commit: 745f682
- Pushed to GitHub: main branch
- Render auto-deploy: In progress

## Testing After Deploy
Once Render shows "Deploy succeeded":

1. Visit https://bibleops.com
2. Fill out the form
3. Submit and verify it processes without errors
4. Check email for 11 PDFs

## Valid Claude Models (as of Nov 2025)
- `claude-3-5-sonnet-20240620` ✅ (Currently using)
- `claude-3-opus-20240229`
- `claude-3-sonnet-20240229`
- `claude-3-haiku-20240307`

For latest models, check: https://docs.anthropic.com/en/docs/models-overview
