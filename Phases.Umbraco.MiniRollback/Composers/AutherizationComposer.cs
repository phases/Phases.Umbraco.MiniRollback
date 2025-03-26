using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Phases.Umbraco.MiniRollback.Controllers.MiniRollback;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;
using Umbraco.Cms.Web.Common.ApplicationBuilder;
using Microsoft.Extensions.Options;
using Umbraco.Extensions;
using Umbraco.Cms.Core.Configuration.Models;
using Umbraco.Cms.Core;
using Umbraco.Cms.Core.Hosting;

namespace Phases.Umbraco.MiniRollback.Composers
{
    public class AutherizationComposer : IComposer
    {
        public void Compose(IUmbracoBuilder builder)
        {
            builder.Services.Configure<UmbracoPipelineOptions>(options =>
            {
                options.AddFilter(new UmbracoPipelineFilter(nameof(MiniRollbackApiController))
                {
                    Endpoints = app => app.UseEndpoints(endpoints =>
                    {
                        var globalSettings = app.ApplicationServices
                            .GetRequiredService<IOptions<GlobalSettings>>().Value;
                        var hostingEnvironment = app.ApplicationServices
                            .GetRequiredService<IHostingEnvironment>();
                        var backofficeArea = Constants.Web.Mvc.BackOfficePathSegment;

                        var rootSegment = $"{globalSettings.GetUmbracoMvcArea(hostingEnvironment)}/{backofficeArea}";
                        var areaName = "lastvalues";
                        endpoints.MapUmbracoRoute<MiniRollbackApiController>(rootSegment, areaName, areaName);
                    })
                });
            });
        }
    }
}
