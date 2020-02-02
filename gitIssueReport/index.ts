
import Promise = require('bluebird');

import {
  GHRepository,
  IssueType,
  IssueState,
  IssueActivity,
  IssueActivityFilter,
  IssueLabelFilter,
  FilterCollection
} from 'gh-issues-api';

export function index(context: any, myTimer: any) {
  var timeStamp = new Date().toISOString();

  if(myTimer.isPastDue) {
      context.log('Function trigger timer is past due!');
  }

  const repoName = process.env['repositoryName'];
  const repoOwner = process.env['repositoryOwner'];
  const labels = [
    'bug',
    'build issue',
    'investigation required',
    'help wanted',
    'enhancement',
    'question',
    'documentation',
  ];

  const repo = new GHRepository(repoOwner, repoName);
  var report = {
    name: repoName,
    at: new Date().toISOString()
  };

  context.log('Issues for ' + repoOwner + '/' + repoName, timeStamp);   
  repo.loadAllIssues().then(() => {
    var promises = labels.map(label => {
      var filterCollection = new FilterCollection();
      filterCollection.label = new IssueLabelFilter(label);
      return repo.list(IssueType.All, IssueState.Open, filterCollection).then(issues => report[label] = issues.length);
    });
    var last7days = new Date(Date.now() - 604800000)
    var staleIssuesFilter = new IssueActivityFilter(IssueActivity.Updated, last7days);
    staleIssuesFilter.negated = true;
    var staleFilters = new FilterCollection();
    staleFilters.activity = staleIssuesFilter;
    promises.push([
      repo.list(IssueType.Issue, IssueState.Open).then(issues => report['total'] = issues.length),
      repo.list(IssueType.PulLRequest, IssueState.Open).then(issues => report['pull_request'] = issues.length),
      repo.list(IssueType.All, IssueState.Open, staleFilters).then(issues => report['stale_7days'] = issues.length)
    ]);

    return Promise.all(promises);
  }).then(() => {
    var reportAsString = JSON.stringify(report);
    context.log(reportAsString);
    context.bindings.issueReport = reportAsString;
    context.done();
  });;
}