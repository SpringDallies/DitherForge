@echo off
rem Pre-merge verification suite for DitherForge (Windows CMD)
echo ==================================================================
echo           DITHERFORGE COMPREHENSIVE PRE-MERGE VERIFICATION        
echo ==================================================================

echo.
echo ^>^>^> [1/3] Engine Integrity Verification...
call npm run engine:verify
if errorlevel 1 (
  echo.
  echo [FAIL] engine:verify failed with exit code %ERRORLEVEL%
  exit /b 1
)

echo.
echo ^>^>^> [2/3] Feature Inventory Verification...
call npm run inventory:check
if errorlevel 1 (
  echo.
  echo [FAIL] inventory:check failed with exit code %ERRORLEVEL%
  exit /b 1
)

echo.
echo ^>^>^> [3/3] Golden Test Suite...
call npm run test:golden
if errorlevel 1 (
  echo.
  echo [FAIL] test:golden failed with exit code %ERRORLEVEL%
  exit /b 1
)

echo.
echo ==================================================================
echo [SUCCESS] PRE-MERGE VERIFICATION PASSED: All 3 suites succeeded cleanly.
echo ==================================================================
exit /b 0
