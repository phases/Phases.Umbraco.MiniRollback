using Microsoft.AspNetCore.Mvc;
using Phases.Umbraco.MiniRollback.Models.MiniRollback;
using Phases.Umbraco.MiniRollback.Services.MiniRollback.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Umbraco.Cms.Core.Services;
using Umbraco.Cms.Web.BackOffice.Controllers;

namespace Phases.Umbraco.MiniRollback.Controllers.MiniRollback
{
    [Area("lastvalues")]
    public class MiniRollbackApiController : UmbracoAuthorizedApiController
    {
        private readonly IContentService _contentService;
        private readonly IMiniRollbackServices _miniRollbackServices;
        public MiniRollbackApiController(IContentService contentService, IMiniRollbackServices miniRollbackServices)
        {
            _contentService = contentService;
            _miniRollbackServices = miniRollbackServices;
        }

        [HttpGet]
        public bool IsEnabled()
        {
            return _miniRollbackServices.IsEnabled;
        }

        public object GetLastValue(int nodeId, string alias, string elementKey = null)
        {

            if (nodeId <= 0 || string.IsNullOrWhiteSpace(alias))
            {
                return NotFound(new { message = "Node not found", values = new List<HistoryData>() });
            }

            var historyData = _miniRollbackServices.GetVersionHistories(nodeId, alias, elementKey) ?? new List<HistoryData>();

            if (!historyData.Any())
            {
                historyData.Add(new HistoryData { Value = "No history found...", Updated = "" });
            }

            return Ok(new { values = historyData.DistinctBy(x => x.Value) });

        }
    }
}
