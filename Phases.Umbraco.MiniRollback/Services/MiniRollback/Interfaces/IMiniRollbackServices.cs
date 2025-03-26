using Phases.Umbraco.MiniRollback.Models.MiniRollback;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Phases.Umbraco.MiniRollback.Services.MiniRollback.Interfaces
{
    public interface IMiniRollbackServices
    {
        List<HistoryData> GetVersionHistories(int nodeId, string alias, string elementKey = null);

        bool IsEnabled { get; }
    }
}
