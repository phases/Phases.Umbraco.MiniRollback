
# Phases.Umbraco.MiniRollback

Phases.Umbraco.MiniRollback is an Umbraco package that adds version history access directly to your content editing interface. By placing a small icon next to text fields, rich text editors, and textarea, users can instantly view previous versions of specific content fields in a simple popup without leaving the page. Making content comparison and recovery faster and easier than ever.


## Installation

Install Phases.Umbraco.MiniRollback with npm

```bash
  Install-Package Phases.Umbraco.MiniRollback
```
Alternatively, you can install Phases.Umbraco.MiniRollback using the .NET CLI:

```bash
  dotnet add package Phases.Umbraco.MiniRollback
```
## FAQ

#### Where can I find the icons to view the history?

After installing this package, a small icon appears next to text fields, rich text editors, and textarea of the Umbraco node (see Screenshot 1).

#### How can I access the history?

By clicking the small icon next to text fields, rich text editors, and textarea, users can instantly view previous versions of specific content fields in a simple popup (see Screenshot 2).

#### How can I revert to a previous version of the content?

After clicking the icon, a simple popup box will display the previous history data. You can select a history entry from the list in the popup box, and the selected data will be set in the related text field, rich text editor, or text area (see Screenshot 3).

#### Is it possible to temporarily disable the MiniRollback functionality?

Yes, the MiniRollback package is enabled by default. If you wish to disable it, add the following to your appsettings.json file:
```bash
    {
      "Phases": {
          "MiniRollback": {
            "Enabled": false
          }
      }
    }
    
    Note: "Enabled": false will disable the functionality
          "Enabled": true will enable the functionality

```

## Screenshots

Icons
![App Screenshot](https://github.com/phases/Phases.Umbraco.MiniRollback/blob/main/Phases.Umbraco.MiniRollback/screenshots/rollback-icon.png?raw=true)

Popup Box
![App Screenshot](https://github.com/phases/Phases.Umbraco.MiniRollback/blob/main/Phases.Umbraco.MiniRollback/screenshots/view-history.png?raw=true)

Select The History Content
![App Screenshot](https://github.com/phases/Phases.Umbraco.MiniRollback/blob/main/Phases.Umbraco.MiniRollback/screenshots/revert-the-history.jpg?raw=true)

