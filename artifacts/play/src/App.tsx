import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Home from "@/pages/home";
import TapPage from "@/pages/tap";
import RaidPage from "@/pages/raid";
import QuizPage from "@/pages/quiz";
import TeamRaidPage from "@/pages/teamRaid";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/tap/:id" component={TapPage} />
      <Route path="/raid/:id" component={RaidPage} />
      <Route path="/quiz/:id" component={QuizPage} />
      <Route path="/team-raid/:id" component={TeamRaidPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
    </QueryClientProvider>
  );
}

export default App;
