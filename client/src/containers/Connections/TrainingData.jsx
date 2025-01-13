import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Accordion, AccordionItem } from "@nextui-org/accordion";
import { Spinner } from "@nextui-org/react";
import { LuCircleArrowLeft } from "react-icons/lu";
import { getTrainingData } from "../../actions/ai";
import { toast } from "react-hot-toast";
import Navbar from "../../components/Navbar";
import { Card, CardHeader, CardBody, Spacer, Input } from "@nextui-org/react";
import { marked } from 'marked';
import { LuSearch } from "react-icons/lu";

function TrainingData() {
  const params = useParams();
  const [trainingData, setTrainingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsSearching(true);
        const data = await getTrainingData(
          params.teamId, 
          params.connectionId,
          { query: searchQuery }
        );
        setLoading(false);
        setTrainingData(data);
      } catch (error) {
        toast.error("Failed to fetch training data");
        console.error("Error fetching training data:", error);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(() => {
      fetchData();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [params.teamId, params.connectionId, searchQuery]);

  return (
    <div>
      <Navbar hideTeam transparent />
      <div className="p-4 sm:mr-96">
        <div className="flex flex-row items-center justify-between mb-6">
          <div className="flex flex-row items-center gap-2">
            <Link 
              to={`/teams/${params.teamId}/connections/${params.connectionId}/explorer`} 
              className="text-xl text-secondary font-semibold"
            >
              <LuCircleArrowLeft size={24} />
            </Link>
            <span className="text-xl font-semibold">Training Data</span>
          </div>
          
          <div className="w-96">
            <Input
              type="text"
              placeholder="Search in training data..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              variant="bordered"
              endContent={isSearching ? <Spinner size="sm" /> : <LuSearch />}
              className="max-w-full"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center">
            <Spinner label="Loading training data..." />
          </div>
        ) : (
          <div className="max-w-full">
            <Accordion>
              {trainingData.map((item, index) => (
                <AccordionItem
                  key={index}
                  title={`${item.metadata.tableName} - ${item.metadata.type}`}
                  className="bg-content1"
                >
                  <div 
                    className="prose prose-sm dark:prose-invert max-w-none markdown-content bg-content2 p-4 rounded-lg"
                    dangerouslySetInnerHTML={{ __html: marked(item.pageContent) }}
                  />
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}
      </div>

      <aside className="hidden sm:block fixed top-0 right-0 z-40 w-96 h-screen" aria-label="Sidebar">
        <div className="h-full px-3 py-4 overflow-y-auto bg-gray-50 dark:bg-gray-800">
          <div className="flex flex-col gap-2 p-2">
            <Spacer y={10} />
            <Card>
              <CardHeader className="flex flex-col items-start">
                <p className="font-semibold">About Training Data</p>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-gray-500">
                  This section shows the training data that has been generated from your database structure.
                </p>
              </CardBody>
            </Card>
          </div>
        </div>
      </aside>
    </div>
  );
}

export default TrainingData; 