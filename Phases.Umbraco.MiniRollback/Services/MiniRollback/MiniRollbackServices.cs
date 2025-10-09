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

        public List<HistoryData> GetVersionHistories(int nodeId, string alias, string elementKey = null, string culture = null)
        {
            var historyData = new List<HistoryData>();

            var content = _contentService.GetById(nodeId);
            if (content != null)
            {
                var versions = _contentService.GetVersions(nodeId)
                    .OrderByDescending(v => v.UpdateDate)
                    .Skip(1)
                    .ToList();

                if (versions.Any())
                {
                    historyData = ExtractHistoryFromVersions(versions, alias, culture);

                    if (!historyData.Any() && !string.IsNullOrWhiteSpace(elementKey))
                    {
                        historyData = ExtractElementKeyHistory(versions, alias, elementKey, culture);
                    }
                }
            }

            return historyData;
        }


        private List<HistoryData> ExtractHistoryFromVersions(IEnumerable<IContent> versions, string alias, string culture = null)
        {
            var historyList = new List<HistoryData>();

            foreach (var version in versions)
            {
                object value = null;

                // Try to get culture-specific value first if culture is provided
                if (!string.IsNullOrWhiteSpace(culture))
                {
                    value = version.GetValue(alias, culture);
                }

                // Fallback to invariant culture if no culture-specific value found
                if (value == null)
                {
                    value = version.GetValue(alias);
                }

                if (value != null)
                {
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
                }
            }

            return stringValue;
        }

        private List<HistoryData> ExtractElementKeyHistory(IEnumerable<IContent> versions, string alias, string elementKey, string culture = null)
        {
            string normalizedElementKey = "umb://element/" + elementKey.Replace("-", "").ToLower();
            var historyData = new List<HistoryData>();

            var jsonContent = JsonConvert.SerializeObject(versions);
            JArray jsonArray = JArray.Parse(jsonContent);

            foreach (var version in jsonArray)
            {
                var properties = version["Properties"]?["$values"];
                var updatedDate = (DateTime)version["UpdateDate"];
                if (properties == null) continue;

                foreach (var property in properties)
                {
                    // Try to get the value based on culture
                    string publishedValue = null;

                    if (!string.IsNullOrWhiteSpace(culture))
                    {
                        // Try culture-specific value first
                        var cultureValue = property["Values"]?.FirstOrDefault(v => v["Culture"]?.ToString() == culture);
                        publishedValue = cultureValue?["EditedValue"]?.ToString();
                    }

                    // Fallback to invariant culture or first available
                    if (string.IsNullOrEmpty(publishedValue))
                    {
                        publishedValue = property["Values"]?.First?["EditedValue"]?.ToString();
                    }

                    if (string.IsNullOrEmpty(publishedValue)) continue;

                    try
                    {
                        if (publishedValue.StartsWith("{"))
                        {
                            JObject propertyJson = JObject.Parse(publishedValue);

                            var foundValue = FindElementValueInJson(propertyJson, normalizedElementKey, alias);

                            if (foundValue != null)
                            {
                                var processedValue = ProcessRteValueIfNeeded(foundValue);

                                historyData.Add(new HistoryData
                                {
                                    Value = processedValue,
                                    Updated = updatedDate.ToString("MMMM d, yyyy h:mm tt")
                                });
                            }
                        }
                    }
                    catch (JsonReaderException)
                    {
                        continue;
                    }
                }
            }

            return historyData;
        }

        private string FindElementValueInJson(JToken token, string normalizedElementKey, string propertyAlias)
        {
            if (token == null) return null;

            // If it's an object
            if (token is JObject obj)
            {
                // First, check if this object is the element we're looking for
                var udi = obj["udi"]?.ToString().ToLower();
                if (udi == normalizedElementKey)
                {
                    var value = obj[propertyAlias];
                    if (value != null)
                    {
                        return value.ToString();
                    }
                }

                // Then search through all properties
                foreach (var prop in obj.Properties())
                {
                    var propValue = prop.Value;

                    // If the property value is a JSON string, parse it and search within
                    if (propValue.Type == JTokenType.String)
                    {
                        var stringValue = propValue.ToString();
                        if (stringValue.StartsWith("{") || stringValue.StartsWith("["))
                        {
                            try
                            {
                                var parsedJson = JToken.Parse(stringValue);
                                var result = FindElementValueInJson(parsedJson, normalizedElementKey, propertyAlias);
                                if (result != null) return result;
                            }
                            catch (JsonReaderException)
                            {
                                // Not valid JSON, skip
                            }
                        }
                    }
                    // If it's an object or array, search recursively
                    else if (propValue is JObject || propValue is JArray)
                    {
                        var result = FindElementValueInJson(propValue, normalizedElementKey, propertyAlias);
                        if (result != null) return result;
                    }
                }
            }
            // If it's an array
            else if (token is JArray array)
            {
                foreach (var item in array)
                {
                    var result = FindElementValueInJson(item, normalizedElementKey, propertyAlias);
                    if (result != null) return result;
                }
            }

            return null;
        }
    }
}
