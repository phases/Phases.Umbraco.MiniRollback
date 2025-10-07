using System.Collections.Generic;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Cms.Core.Manifest;

namespace Phases.Umbraco.MiniRollback.Composers
{
    public class MiniRollbackManifestComposer : IComposer
    {
        public void Compose(IUmbracoBuilder builder)
        {
            builder.ManifestFilters().Append<MiniRollbackManifestFilter>();
        }
    }

    public class MiniRollbackManifestFilter : IManifestFilter
    {
        public void Filter(List<PackageManifest> manifests)
        {
            manifests.Add(new PackageManifest
            {
                PackageName = "Phases.Umbraco.MiniRollback",
                Scripts = new[]
                {
                    "/App_Plugins/Phases.Umbraco.MiniRollback/js/miniRollbackController.js"
                },
                Stylesheets = new[]
                {
                    "/App_Plugins/Phases.Umbraco.MiniRollback/css/style.minirollback.css"
                }
            });
        }
    }
}