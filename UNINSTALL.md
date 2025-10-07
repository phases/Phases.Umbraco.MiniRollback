# Uninstalling Phases.Umbraco.MiniRollback

To completely uninstall the package, follow these steps:

## Step 1: Uninstall the NuGet Package

```bash
dotnet remove package Phases.Umbraco.MiniRollback
```

## Step 2: Clean the Project

```bash
dotnet clean
```

## Step 3: Manually Remove App_Plugins Folder (if still present)

Delete the following folder from your project:
```
/App_Plugins/Phases.Umbraco.MiniRollback/
```

## Step 4: Clear Umbraco Cache

Delete these folders:
```
/umbraco/Data/TEMP/
/umbraco/Data/DistCache/
```

## Step 5: Restart the Application

Restart your web application completely.

## Step 6: Clear Browser Cache

Clear your browser cache (Ctrl+Shift+Delete) or do a hard refresh (Ctrl+F5).

---

## Troubleshooting

If you still see errors in the browser console after uninstalling:

1. Check if `/App_Plugins/Phases.Umbraco.MiniRollback/` folder still exists - delete it manually
2. Ensure you deleted the Umbraco TEMP folders
3. Rebuild your solution: `dotnet build`
4. Restart IIS/Kestrel completely
5. Clear browser cache and do a hard refresh

If the package files still appear in browser sources, this is due to browser caching - they are not actually being served by the server.