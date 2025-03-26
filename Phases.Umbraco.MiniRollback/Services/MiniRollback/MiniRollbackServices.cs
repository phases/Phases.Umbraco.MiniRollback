using Newtonsoft.Json.Linq;
using Newtonsoft.Json;
using Phases.Umbraco.MiniRollback.Models.MiniRollback;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Umbraco.Cms.Core.Models;
using Umbraco.Cms.Core.Services;
using Phases.Umbraco.MiniRollback.Services.MiniRollback.Interfaces;
using Microsoft.Extensions.Configuration;

namespace Phases.Umbraco.MiniRollback.Services.MiniRollback
{
    public class MiniRollbackServices : IMiniRollbackServices
    {
        private readonly IContentService _contentService;
        private readonly IConfiguration _configuration;
        public MiniRollbackServices(IContentService contentService, IConfiguration configuration)
        {
            _contentService = contentService;
            _configuration = configuration;
        }

        public bool IsEnabled => _configuration.GetValue<bool>("Phases:MiniRollback:Enabled", true);
        public List<HistoryData> GetVersionHistories(int nodeId, string alias, string elementKey = null)
        {
            var historyData = new List<HistoryData>();

            var content = _contentService.GetById(nodeId);
            if (content != null)
            {
                var versions = _contentService.GetVersions(nodeId)
                    .OrderByDescending(v => v.UpdateDate)
                    .Skip(1) // Skip latest version
                    .ToList();

                if (versions.Any())
                {
                    historyData = ExtractHistoryFromVersions(versions, alias);

                    if (!historyData.Any() && !string.IsNullOrWhiteSpace(elementKey))
                    {
                        historyData = ExtractElementKeyHistory(versions, alias, elementKey);
                    }
                }
            }

            return historyData;
        }

        private List<HistoryData> ExtractHistoryFromVersions(IEnumerable<IContent> versions, string alias)
        {
            var historyList = new List<HistoryData>();

            foreach (var version in versions)
            {
                var value = version.GetValue(alias);

                if (value != null)
                {
                    // Process the value to handle potential RTE JSON format
                    var processedValue = ProcessRteValueIfNeeded(value);

                    historyList.Add(new HistoryData
                    {
                        Value = processedValue,
                        Updated = version.UpdateDate.ToString("MMMM d, yyyy h:mm tt")
                    });
                }
            }

            return historyList;
        }

        private string ProcessRteValueIfNeeded(object value)
        {
            if (value == null) return null;

            var stringValue = value.ToString();

            // Check if the value is potentially a JSON string with the RTE structure
            if (stringValue.StartsWith("{") && stringValue.Contains("\"markup\""))
            {
                try
                {
                    var rteObject = JObject.Parse(stringValue);
                    if (rteObject["markup"] != null)
                    {
                        return rteObject["markup"].ToString();
                    }
                }
                catch (JsonReaderException)
                {
                    // If parsing fails, return the original value
                }
            }

            return stringValue;
        }

        private List<HistoryData> ExtractElementKeyHistory(IEnumerable<IContent> versions, string alias, string elementKey)
        {
            string normalizedElementKey = "umb://element/" + elementKey.Replace("-", "").ToLower();
            var historyData = new List<HistoryData>();

            var jsonContent = JsonConvert.SerializeObject(versions);

            JArray jsonArray = JArray.Parse(jsonContent); // Use JArray since versions are a list

            foreach (var version in jsonArray)
            {
                var properties = version["Properties"]?["$values"];
                var updatedDate = (DateTime)version["UpdateDate"];
                if (properties == null) continue;

                foreach (var property in properties)
                {
                    var publishedValue = property["Values"]?.First?["EditedValue"]?.ToString();
                    if (string.IsNullOrEmpty(publishedValue)) continue;

                    try
                    {
                        if (publishedValue.StartsWith("{"))
                        {
                            JObject blockListJson = JObject.Parse(publishedValue);

                            // Check if it's a block list structure
                            if (blockListJson["contentData"] != null)
                            {
                                var contentData = blockListJson["contentData"];

                                var matchingBlock = contentData?.FirstOrDefault(cd =>
                                    cd["udi"] != null && cd["udi"].ToString().ToLower() == normalizedElementKey);

                                if (matchingBlock != null)
                                {
                                    var blockValue = matchingBlock[alias]?.ToString();

                                    // Process the value if it's in RTE JSON format
                                    var processedValue = ProcessRteValueIfNeeded(blockValue);

                                    var history = new HistoryData
                                    {
                                        Value = processedValue,
                                        Updated = updatedDate.ToString("MMMM d, yyyy h:mm tt")
                                    };

                                    historyData.Add(history);
                                }
                            }
                        }
                    }
                    catch (JsonReaderException)
                    {
                        continue; // Skip if PublishedValue is not valid JSON
                    }
                }
            }
            return historyData;
        }
    }
}
