import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Accordion, AccordionItem } from "@nextui-org/accordion";
import { Spinner } from "@nextui-org/react";
import { LuCircleArrowLeft } from "react-icons/lu";
import { getTrainingData } from "../../actions/ai";
import { toast } from "react-hot-toast";
import Navbar from "../../components/Navbar";

function TrainingData() {
  const params = useParams();
  const [trainingData, setTrainingData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getTrainingData(params.teamId, params.connectionId);
        setTrainingData(data);
      } catch (error) {
        toast.error("Failed to fetch training data");
        console.error("Error fetching training data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.teamId, params.connectionId]);

  return (
    <div>
      <Navbar hideTeam transparent />
      <div className="p-4">
        <div className="flex flex-row items-center gap-2 mb-6">
          <Link 
            to={`/teams/${params.teamId}/connections/${params.connectionId}/explorer`} 
            className="text-xl text-secondary font-semibold"
          >
            <LuCircleArrowLeft size={24} />
          </Link>
          <span className="text-xl font-semibold">Training Data</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center">
            <Spinner label="Loading training data..." />
          </div>
        ) : (
          <div className="max-w-5xl mx-auto">
            <Accordion>
              {trainingData.map((item, index) => (
                <AccordionItem
                  key={index}
                  title={`${item.metadata.tableName} - ${item.metadata.type}`}
                >
                  <pre className="whitespace-pre-wrap bg-content2 p-4 rounded-lg">
                    {item.pageContent}
                  </pre>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}
      </div>
    </div>
  );
}

export default TrainingData; 