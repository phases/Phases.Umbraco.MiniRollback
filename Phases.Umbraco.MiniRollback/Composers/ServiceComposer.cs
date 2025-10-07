using Microsoft.Extensions.DependencyInjection;
using Phases.Umbraco.MiniRollback.Services.MiniRollback;
using Phases.Umbraco.MiniRollback.Services.MiniRollback.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Umbraco.Cms.Core.Composing;
using Umbraco.Cms.Core.DependencyInjection;

namespace Phases.Umbraco.MiniRollback.Composers
{
    public class ServiceComposer : IComposer
    {
        public void Compose(IUmbracoBuilder builder)
        {
            builder.Services.AddTransient<IMiniRollbackServices, MiniRollbackServices>();
        }
    }
}
