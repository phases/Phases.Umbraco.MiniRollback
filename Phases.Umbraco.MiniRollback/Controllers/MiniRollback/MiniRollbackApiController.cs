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
        public IActionResult IsEnabled()
        {
            try
            {
                return Ok(_miniRollbackServices.IsEnabled);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Error checking service status" });
            }
        }

        public object GetLastValue(int nodeId, string alias, string elementKey = null)
        {

            try
            {
                if (nodeId <= 0 || string.IsNullOrWhiteSpace(alias))
                {
                    return BadRequest(new { message = "Invalid parameters", values = new List<HistoryData>() });
                }

                var historyData = _miniRollbackServices.GetVersionHistories(nodeId, alias, elementKey);

                if (historyData == null || !historyData.Any())
                {
                    historyData = new List<HistoryData>
                    {
                        new HistoryData { Value = "No history found...", Updated = "" }
                    };
                }

                var distinctData = historyData.DistinctBy(x => x.Value).ToList();
                return Ok(new { values = distinctData });
            }
            catch (Exception ex)
            {
               
                return StatusCode(500, new
                {
                    message = "Error retrieving version history",
                    values = new List<HistoryData>
                    {
                        new HistoryData { Value = "Error loading history. Please try again.", Updated = "" }
                    }
                });
            }

        }
    }
}
